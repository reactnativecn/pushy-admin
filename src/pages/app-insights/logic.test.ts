import { describe, expect, it } from 'bun:test';
import {
  beijingToday,
  buildFunnelRows,
  computeFunnelRates,
  filterFunnelRows,
  highestFailureDimension,
  isKnownCarrier,
  lagShares,
  normalizeOSVersion,
  observationCount,
  parseFailureReason,
  parseInsightDays,
  parseInsightView,
  rankCounts,
  summarizeBreakdown,
  summarizeTraffic,
  trafficWarnings,
  versionTotals,
} from './logic';
import type {
  AppEventBreakdownDay,
  AppTrafficDay,
  FunnelEventCounts,
  VersionFunnel,
  VersionFunnelResponse,
} from './types';

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
const offered = { hdiff: 0, pdiff: 0, full: 6, fullPending: 0, exp: 0 };
const version = (): VersionFunnel => ({
  hash: 'v1',
  name: 'Version 1',
  served: offered,
  events: events({ markSuccess: 5 }),
  adopted: { mark: 5, download: 5 },
  lag: { downloadSuccess: { lt1h: 5 }, markSuccess: { lt1h: 5 } },
  byPackage: [
    {
      packageVersion: '1.0',
      served: { ...offered, full: 2 },
      events: events({ markSuccess: 2 }),
    },
  ],
});
const response = (
  overrides: Partial<VersionFunnelResponse> = {},
): VersionFunnelResponse => ({
  days: 7,
  start: '2026-09-21',
  end: '2026-09-27',
  hourlyFrom: '2026-09-25',
  dauToday: 2,
  versions: [version()],
  ...overrides,
});
const day = (
  date: string,
  overrides: Partial<AppTrafficDay> = {},
): AppTrafficDay => ({
  date,
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
const breakdown = (
  overrides: Partial<AppEventBreakdownDay> = {},
): AppEventBreakdownDay => ({
  date: '2026-09-26',
  byOS: [],
  byReason: [],
  byCarrier: [],
  ...overrides,
});

describe('parameters and basic aggregation', () => {
  it('keeps URL compatibility and defaults', () => {
    expect(parseInsightDays('14')).toBe(14);
    expect(parseInsightDays('9')).toBe(7);
    expect(parseInsightDays('35')).toBe(30);
    expect(parseInsightView('versions')).toBe('versions');
    expect(parseInsightView(null)).toBe('overview');
    expect(beijingToday(Date.UTC(2026, 8, 26, 20))).toBe('2026-09-27');
  });
  it('ranks positive counts deterministically and drops invalid values', () => {
    expect(rankCounts({ b: 2, a: 2, c: -1, d: Number.NaN })).toEqual([
      { key: 'a', count: 2, percent: 50 },
      { key: 'b', count: 2, percent: 50 },
    ]);
    expect(rankCounts(undefined)).toEqual([]);
  });
});

describe('complete-day means and missing observations', () => {
  it('includes valid zero days in both means, excludes today and future days', () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      day(`2026-09-${20 + i}`, {
        requests: i === 0 ? 100 : 0,
        dau: i === 0 ? 100 : 0,
        requestsStatus: 'observed',
        dauStatus: 'observed',
      }),
    );
    const result = summarizeTraffic(
      [
        ...days,
        day('2026-09-27', { requests: 999, dau: 999 }),
        day('2026-09-28', { requests: 999, dau: 999 }),
      ],
      '2026-09-27',
    );
    expect(result.averageDau).toBe(100 / 7);
    expect(result.averageDailyRequests).toBe(100 / 7);
    expect(result.dauSampleDays).toBe(7);
    expect(result.requestSampleDays).toBe(7);
    expect(result.completedDays).toBe(7);
  });
  it('does not turn unavailable days into observed zeroes', () => {
    const result = summarizeTraffic(
      [
        day('2026-09-24', {
          requests: 10,
          dau: 5,
          requestsStatus: 'observed',
          dauStatus: 'observed',
        }),
        day('2026-09-25', {
          requestsStatus: 'unavailable',
          dauStatus: 'unavailable',
        }),
        day('2026-09-26', {
          requestsStatus: 'observed',
          dauStatus: 'observed',
        }),
      ],
      '2026-09-27',
    );
    expect(result.averageDailyRequests).toBe(5);
    expect(result.averageDau).toBe(2.5);
    expect(result.dauSampleDays).toBe(2);
    expect(result.completedDays).toBe(3);
    expect(result.daily[1]?.dau).toBeNull();
    expect(observationCount(9, 'unavailable')).toBeNull();
    expect(observationCount(0, 'observed')).toBe(0);
    expect(observationCount(Number.NaN)).toBeNull();
  });
  it('respects a supplied business today instead of browser or Beijing date', () => {
    const result = summarizeTraffic(
      [day('2026-09-26', { dau: 9 })],
      '2026-09-26',
    );
    expect(result.today?.dau).toBe(9);
    expect(result.averageDau).toBeNull();
  });
  it('maps Android API levels and folds iOS patch versions', () => {
    expect(normalizeOSVersion('android 34')).toBe('android 14');
    expect(normalizeOSVersion('android 32')).toBe('android 12');
    expect(normalizeOSVersion('android 99')).toBe('android API 99');
    expect(normalizeOSVersion('ios 17.5.1')).toBe('ios 17.5');
    expect(normalizeOSVersion('ios 18')).toBe('ios 18.0');
    expect(normalizeOSVersion('tvos 18.0')).toBe('tvos 18.0');
    expect(normalizeOSVersion('harmony 12')).toBe('harmony 5.0.0');
    expect(normalizeOSVersion('harmony 20')).toBe('harmony 6.0.0');
    expect(normalizeOSVersion('harmony 24')).toBe('harmony 6.1.1');
    expect(normalizeOSVersion('harmony 99')).toBe('harmony API 99');
    expect(normalizeOSVersion('unknown')).toBe('unknown');
  });
  it('groups OS labels into platforms and ranks OS versions', () => {
    const result = summarizeTraffic(
      [
        day('2026-09-26', {
          os: { 'android 34': 30, 'ios 17.5': 10 },
        }),
        day('2026-09-27', { os: { 'android 35': 20, 'ios 17.5.1': 5 } }),
      ],
      '2026-09-27',
    );
    expect(result.hasClientInfo).toBe(true);
    expect(result.platforms.map((row) => [row.key, row.count])).toEqual([
      ['android', 50],
      ['ios', 15],
    ]);
    expect(result.osVersions.map((row) => [row.key, row.count])).toEqual([
      ['android 14', 30],
      ['android 15', 20],
      ['ios 17.5', 15],
    ]);
    expect(summarizeTraffic([day('2026-09-27')]).hasClientInfo).toBe(false);
  });
  it('is empty safe without fabricating means or device peaks', () => {
    const result = summarizeTraffic(undefined);
    expect(result.averageDau).toBeNull();
    expect(result.averageDailyRequests).toBeNull();
    expect(result.peakDau).toBeNull();
    expect(result.today).toBeNull();
    expect(result.hourlyDays).toEqual([]);
  });
  it('keeps legacy positive device observations but does not invent observed zeroes', () => {
    const result = summarizeTraffic(
      [day('2026-09-25', { dau: 10 }), day('2026-09-26')],
      '2026-09-27',
    );
    expect(result.averageDau).toBe(10);
    expect(result.dauSampleDays).toBe(1);
    expect(result.daily[1]?.dau).toBeNull();
  });
});

describe('package observations and refusals', () => {
  it('reports partial and expired data rather than a whole-window device count', () => {
    const result = summarizeTraffic(
      [
        day('2026-09-01', {
          requests: 100,
          packages: [
            {
              packageVersion: '1',
              requests: 100,
              devices: null,
              devicesStatus: 'expired',
            },
          ],
        }),
        day('2026-09-26', {
          requests: 20,
          packageDevicesLimited: true,
          packages: [
            {
              packageVersion: '1',
              requests: 20,
              devices: 3,
              devicesStatus: 'partial',
            },
          ],
        }),
        day('2026-09-27', {
          requests: 10,
          packages: [
            {
              packageVersion: '1',
              requests: 10,
              devices: 2,
              devicesStatus: 'observed',
            },
          ],
        }),
      ],
      '2026-09-27',
    );
    expect(result.packages[0]).toMatchObject({
      requests: 130,
      peakDevices: 3,
      percent: 100,
      observedDays: 2,
      availableStart: '2026-09-26',
      availableEnd: '2026-09-27',
      partial: true,
      expiredDays: 1,
    });
  });
  it('does not interpret missing or legacy zero device estimates as no users', () => {
    const result = summarizeTraffic([
      day('2026-09-26', {
        packages: [{ packageVersion: 'old', requests: 3, devices: 0 }],
      }),
    ]);
    expect(result.packages[0]?.peakDevices).toBeNull();
    expect(result.packages[0]?.unavailableDays).toBe(1);
  });
  it('retains refusal detail and request-based shares', () => {
    const result = summarizeTraffic([
      day('2026-09-26', {
        requests: 10,
        hit: { blocked: 2, unknown_package: 1, full: 7 },
        refused: [{ outcome: 'blocked', packageVersion: '1.0', requests: 2 }],
        hourly: [3, 7],
        carriers: { 电信: 10 },
      }),
    ]);
    expect(trafficWarnings(result.hit)).toEqual(['blocked', 'unknown_package']);
    expect(result.updatePercent).toBe(70);
    expect(result.refusedPercent).toBe(30);
    expect(result.refused.blocked).toEqual([
      { packageVersion: '1.0', requests: 2 },
    ]);
    expect(result.carriers[0]?.percent).toBe(100);
  });
});

describe('independent version observations', () => {
  it('never derives coverage or adoption conversion from 5 retained UUIDs and 2 DAU', () => {
    const row = buildFunnelRows(response())[0]!;
    expect(row.retained?.mark).toBe(5);
    expect(row.servedTotal).toBe(6);
    expect('coverage' in row).toBe(false);
    expect('adoptionRate' in row).toBe(false);
  });
  it('honors explicit null observations rather than falling back to adopted', () => {
    const row = buildFunnelRows(
      response({
        versions: [{ ...version(), observed: { mark: null, download: null } }],
      }),
    )[0]!;
    expect(row.retained?.mark).toBeNull();
    expect(row.retained?.download).toBeNull();
  });
  it('hides whole-version observations under native-package filters without mutation', () => {
    const original = buildFunnelRows(response());
    const filtered = filterFunnelRows(original, 'v1', '1.0')[0]!;
    expect(filtered.retained).toBeNull();
    expect(filtered.events.markSuccess).toBe(2);
    expect(filtered.servedTotal).toBe(2);
    expect(original[0]?.retained?.mark).toBe(5);
    expect(filterFunnelRows(original, undefined, 'missing')).toEqual([]);
    expect(filterFunnelRows(original, 'missing')).toEqual([]);
  });
  it('uses uncapped app summaries including unattributed events', () => {
    const result = versionTotals(
      response({
        truncated: true,
        summary: {
          versionCount: 51,
          offeredTargets: 52,
          events: events({ rollback: 7 }),
          unattributed: events({ rollback: 7 }),
          unattributedOffers: 0,
        },
      }),
    );
    expect(result?.versionCount).toBe(51);
    expect(result?.events.rollback).toBe(7);
    expect(result?.scope).toBe('all_observed');
  });
  it('labels legacy sums as returned-version subtotals', () => {
    const result = versionTotals(response({ truncated: true }));
    expect(result?.scope).toBe('returned_versions');
    expect(result?.offeredTargets).toBe(6);
    expect(result?.unattributed).toBeNull();
    expect(versionTotals(undefined)).toBeNull();
  });
  it('classifies only rollback reports and exposes sample counts separately', () => {
    const result = computeFunnelRates(
      events({ downloadFail: 90, markSuccess: 10 }),
    );
    expect(result.rollbackSamples).toBe(10);
    expect(result.failures).toBe(90);
    expect(result.rollbackRate).toBe(0);
    expect(
      computeFunnelRates(events({ markSuccess: 3, rollback: 1 })).health,
    ).toBeNull();
    expect(
      computeFunnelRates(events({ markSuccess: 90, rollback: 10 })).health,
    ).toBe('critical');
  });
  it('keeps lag reports distinct and discards invalid values', () => {
    const result = lagShares({ lt1h: 30, '6h-24h': 10, gt7d: Number.NaN });
    expect(result.total).toBe(40);
    expect(result.shares[0]?.percent).toBe(75);
    expect(result.shares).toHaveLength(6);
    expect(lagShares(null).total).toBe(0);
  });
});

describe('diagnostic report shares, not attempt failure rates', () => {
  it('keeps a patch failure followed by success as two reports', () => {
    const result = summarizeBreakdown([
      breakdown({
        byOS: [
          { type: 'patch_fail', hash: 'v1', name: 'V1', os: 'ios', count: 1 },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 1,
          },
        ],
      }),
    ]);
    expect(result.os[0]?.failureSamples).toBe(2);
    expect(result.os[0]?.failureRate).toBe(0.5);
    expect(highestFailureDimension(result.os)).toBeNull();
  });
  it('does not rank one failure or a zero-failure platform above sufficient evidence', () => {
    const result = summarizeBreakdown([
      breakdown({
        byOS: [
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            os: 'tiny',
            count: 1,
          },
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 10,
          },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 90,
          },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'android',
            count: 100,
          },
        ],
      }),
    ]);
    expect(highestFailureDimension(result.os)?.key).toBe('ios');
    expect(
      highestFailureDimension(result.os.filter((row) => row.key === 'android')),
    ).toBeNull();
  });
  it('normalizes legacy free-text reasons and keeps version and carrier scopes separate', () => {
    const days = [
      breakdown({
        byReason: [
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'other:private-a',
            count: 2,
          },
          {
            type: 'patch_fail',
            hash: 'v2',
            name: null,
            reason: 'other:private-b',
            count: 3,
          },
        ],
        byCarrier: [{ type: 'download_fail', carrier: '电信', count: 5 }],
      }),
    ];
    const result = summarizeBreakdown(days);
    expect(result.failures).toBe(5);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]?.reason).toBe('other');
    expect(result.reasons[0]?.percent).toBe(100);
    expect(summarizeBreakdown(days, 'v1').failures).toBe(2);
    expect(summarizeBreakdown(days, 'v1').carriers).toEqual([]);
    expect(parseFailureReason('other:private')).toEqual({
      kind: 'other',
    });
    expect(parseFailureReason('timeout')).toEqual({
      kind: 'known',
      reason: 'timeout',
    });
    expect(isKnownCarrier('移动')).toBe(true);
    expect(summarizeBreakdown(undefined).reasons).toEqual([]);
  });
  it('ignores legacy rollback reason rows', () => {
    const result = summarizeBreakdown([
      breakdown({
        byReason: [
          {
            type: 'patch_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'crc_mismatch',
            count: 4,
          },
          {
            type: 'rollback',
            hash: 'v1',
            name: 'V1',
            reason: 'empty',
            count: 40,
          },
        ],
      }),
    ]);
    expect(result.failures).toBe(4);
    expect(result.reasons.map((row) => row.reason)).toEqual(['crc_mismatch']);
  });
});
