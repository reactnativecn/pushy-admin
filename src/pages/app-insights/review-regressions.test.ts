import { describe, expect, it } from 'bun:test';
import {
  buildFunnelRows,
  computeFunnelRates,
  rankFunnelRows,
  summarizeBreakdown,
  summarizeTraffic,
} from './logic';
import type {
  AppEventBreakdownDay,
  AppTrafficDay,
  FunnelEventCounts,
  VersionFunnel,
  VersionFunnelResponse,
} from './types';

const traffic = (overrides: Partial<AppTrafficDay> = {}): AppTrafficDay => ({
  date: '2026-09-25',
  requests: 0,
  dau: 0,
  hourly: [],
  hit: {},
  ipVersion: {},
  hosts: {},
  carriers: {},
  packages: [],
  ...overrides,
});
const events = (
  overrides: Partial<FunnelEventCounts> = {},
): FunnelEventCounts => ({
  downloadSuccess: 0,
  downloadFail: 0,
  patchFail: 0,
  markSuccess: 0,
  rollback: 0,
  ...overrides,
});
const breakdown = (
  overrides: Partial<AppEventBreakdownDay> = {},
): AppEventBreakdownDay => ({
  date: '2026-09-25',
  byReason: [],
  byOS: [],
  byCarrier: [],
  ...overrides,
});
const failedDay = (): AppEventBreakdownDay =>
  breakdown({
    status: 'unavailable',
    byReason: [
      {
        type: 'download_fail',
        hash: 'unavailable',
        name: null,
        reason: 'network',
        count: 500,
      },
    ],
    byOS: [
      {
        type: 'download_fail',
        hash: 'unavailable',
        name: null,
        os: 'unavailable',
        count: 500,
      },
    ],
    byCarrier: [{ type: 'download_fail', carrier: 'unavailable', count: 500 }],
  });

describe('review: request ratios use matching observation days', () => {
  it('excludes unavailable request numerators without dropping independent series', () => {
    const input = [
      traffic({
        requests: 1000,
        requestsStatus: 'unavailable',
        dau: 8,
        dauStatus: 'observed',
        hit: { blocked: 500, full: 500 },
        hourly: [20],
        hosts: { independent: 20 },
        packages: [
          {
            packageVersion: '1.0',
            requests: 1000,
            devices: 8,
            devicesStatus: 'observed',
          },
        ],
        refused: [{ outcome: 'blocked', packageVersion: '1.0', requests: 500 }],
      }),
      traffic({
        date: '2026-09-26',
        requests: 100,
        requestsStatus: 'observed',
        hit: { blocked: 10, full: 90 },
        hourly: [10],
        packages: [
          {
            packageVersion: '1.0',
            requests: 100,
            devices: 3,
            devicesStatus: 'observed',
          },
        ],
        refused: [{ outcome: 'blocked', packageVersion: '1.0', requests: 10 }],
      }),
    ];
    const before = structuredClone(input);
    const result = summarizeTraffic(input, '2026-09-27');
    expect(result.requests).toBe(100);
    expect(result.refusedPercent).toBe(10);
    expect(result.updatePercent).toBe(90);
    expect(result.packages[0]).toMatchObject({
      requests: 100,
      percent: 100,
      peakDevices: 8,
    });
    expect(result.refused.blocked).toEqual([
      { packageVersion: '1.0', requests: 10 },
    ]);
    expect(result.daily[0]?.hit.blocked).toBe(0);
    expect(result.daily[0]?.requests).toBeNull();
    expect(result.hourlyDays.map((item) => item.hourly[0])).toEqual([20, 10]);
    expect(result.hosts[0]?.count).toBe(20);
    expect(input).toEqual(before);
  });
  it('excludes numerators when their request denominator is invalid', () => {
    for (const requests of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const result = summarizeTraffic(
        [
          traffic({
            requests,
            hit: { blocked: 500 },
            packages: [{ packageVersion: '1', requests: 500, devices: 2 }],
            refused: [
              { outcome: 'blocked', packageVersion: '1', requests: 500 },
            ],
          }),
        ],
        '2026-09-27',
      );
      expect(result.hit.blocked).toBe(0);
      expect(result.refused.blocked).toEqual([]);
      expect(result.packages[0]?.requests).toBeNull();
      expect(result.packages[0]?.percent).toBeNull();
      expect(result.packages[0]?.peakDevices).toBe(2);
    }
  });
  it('preserves explicit observed device zeroes but excludes ambiguous legacy zeroes', () => {
    const input = [
      traffic({ date: '2026-09-21', dau: 10 }),
      traffic({ date: '2026-09-22', dau: 0 }),
      traffic({ date: '2026-09-23', dau: 0, dauStatus: 'observed' }),
      traffic({ date: '2026-09-24', dau: 999, dauStatus: 'unavailable' }),
      traffic({ date: '2026-09-27', dau: 999, dauStatus: 'observed' }),
    ];
    const result = summarizeTraffic(input, '2026-09-27');
    expect(result.averageDau).toBe(5);
    expect(result.dauSampleDays).toBe(2);
    expect(result.daily.map((day) => day.dau)).toEqual([
      10,
      null,
      0,
      null,
      999,
    ]);
  });
});

describe('review: failure availability and canonical reason identity', () => {
  it('keeps unavailable counts out of every dimension and distinguishes an observed empty day', () => {
    const input = [
      failedDay(),
      breakdown({ status: 'observed' }),
      breakdown({
        status: 'observed',
        byReason: [
          {
            type: 'patch_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'patch_apply',
            count: 2,
          },
        ],
        byOS: [
          { type: 'patch_fail', hash: 'v1', name: 'V1', os: 'ios', count: 2 },
        ],
        byCarrier: [{ type: 'patch_fail', carrier: 'known', count: 2 }],
      }),
    ];
    const before = structuredClone(input);
    const result = summarizeBreakdown(input);
    expect(result).toMatchObject({
      totalDays: 3,
      availableDays: 2,
      unavailableDays: 1,
      legacyDays: 0,
      failures: 2,
    });
    expect(result.reasons.map((row) => row.reason)).toEqual(['patch_apply']);
    expect(result.os.map((row) => row.key)).toEqual(['ios']);
    expect(result.carriers.map((row) => row.key)).toEqual(['known']);
    expect(result.versionNames.has('unavailable')).toBe(false);
    expect(summarizeBreakdown(input, 'absent')).toMatchObject({
      availableDays: 2,
      unavailableDays: 1,
      failures: 0,
      reasons: [],
      os: [],
      carriers: [],
    });
    expect(input).toEqual(before);
  });
  it('does not treat empty legacy or explicit unavailable buckets as observed zero failures', () => {
    const result = summarizeBreakdown([failedDay(), breakdown()]);
    expect(result).toMatchObject({
      totalDays: 2,
      availableDays: 0,
      unavailableDays: 2,
      legacyDays: 1,
      failures: 0,
    });
    const legacy = breakdown({
      byOS: [
        {
          type: 'download_success',
          hash: 'v1',
          name: null,
          os: 'ios',
          count: 1,
        },
      ],
    });
    expect(summarizeBreakdown([legacy], 'absent')).toMatchObject({
      availableDays: 1,
      unavailableDays: 0,
      legacyDays: 1,
      failures: 0,
    });
    expect(
      summarizeBreakdown([breakdown({ status: 'observed' })]),
    ).toMatchObject({ availableDays: 1, unavailableDays: 0, failures: 0 });
  });
  it('merges future and legacy unknown reasons into one Other row with intact totals', () => {
    const input = breakdown({
      status: 'observed',
      byReason: [
        {
          type: 'download_fail',
          hash: 'v1',
          name: 'V1',
          reason: 'dns',
          count: 2,
        },
        { type: 'patch_fail', hash: 'v2', name: 'V2', reason: 'ssl', count: 3 },
        {
          type: 'patch_fail',
          hash: 'v1',
          name: 'V1',
          reason: 'other:old',
          count: 4,
        },
        {
          type: 'download_fail',
          hash: 'v2',
          name: 'V2',
          reason: 'other',
          count: 1,
        },
        {
          type: 'download_fail',
          hash: 'v1',
          name: 'V1',
          reason: 'network',
          count: 5,
        },
      ],
    });
    const result = summarizeBreakdown([input]);
    expect(result.failures).toBe(15);
    expect(result.reasons.map((row) => row.reason)).toEqual([
      'other',
      'network',
    ]);
    expect(result.reasons[0]).toMatchObject({
      count: 10,
      percent: (10 / 15) * 100,
      byType: { download_fail: 3, patch_fail: 7 },
      versions: [
        { hash: 'v1', name: 'V1', count: 6 },
        { hash: 'v2', name: 'V2', count: 4 },
      ],
    });
  });
});

describe('review: stable version ranking and shared rollback boundaries', () => {
  it('sorts every event component and breaks ties by hash without mutating cached rows', () => {
    const makeVersion = (
      hash: string,
      counts: FunnelEventCounts,
      full = 0,
    ): VersionFunnel => ({
      hash,
      name: hash,
      served: { hdiff: 0, pdiff: 0, full, fullPending: 0, exp: 0 },
      events: counts,
      adopted: { mark: 0, download: 0 },
      byPackage: [],
      lag: { markSuccess: null, downloadSuccess: null },
    });
    const response: VersionFunnelResponse = {
      days: 7,
      start: '2026-09-21',
      end: '2026-09-27',
      hourlyFrom: '2026-09-25',
      dauToday: 0,
      versions: [
        makeVersion('z', events(), 10),
        makeVersion('a', events({ rollback: 10 })),
        makeVersion('small', events({ markSuccess: 1 })),
        makeVersion('download', events({ downloadSuccess: 20 })),
        makeVersion('failed', events({ downloadFail: 30 })),
        makeVersion('patched', events({ patchFail: 40 })),
      ],
    };
    const rows = buildFunnelRows(response);
    const before = rows.map((row) => row.hash);
    expect(
      rankFunnelRows(rows)
        .slice(0, 5)
        .map((row) => row.hash),
    ).toEqual(['patched', 'failed', 'download', 'a', 'z']);
    expect(rows.map((row) => row.hash)).toEqual(before);
  });
  it('classifies 1% and 5% inclusively and keeps fewer than ten reports insufficient', () => {
    expect(computeFunnelRates(events({ markSuccess: 9 })).health).toBeNull();
    expect(computeFunnelRates(events({ markSuccess: 10 })).health).toBe(
      'healthy',
    );
    expect(
      computeFunnelRates(events({ markSuccess: 99, rollback: 1 })).health,
    ).toBe('warning');
    expect(
      computeFunnelRates(events({ markSuccess: 95, rollback: 5 })).health,
    ).toBe('critical');
  });
});
