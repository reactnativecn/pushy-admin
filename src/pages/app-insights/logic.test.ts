import { describe, expect, it } from 'bun:test';

const near = (value: number | null | undefined, expected: number) =>
  expect(Math.abs((value ?? Number.NaN) - expected) < 1e-9).toBe(true);

import {
  beijingToday,
  buildFunnelRows,
  computeFunnelRates,
  lagShares,
  parseFailureReason,
  parseInsightDays,
  parseInsightView,
  rankCounts,
  summarizeBreakdown,
  summarizeTraffic,
  trafficWarnings,
} from './logic';
import type {
  AppEventBreakdownDay,
  AppTrafficDay,
  VersionFunnelResponse,
} from './types';

const trafficDay = (
  overrides: Partial<AppTrafficDay> & { date: string },
): AppTrafficDay => ({
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

describe('URL params', () => {
  it('falls back to defaults for unknown values', () => {
    expect(parseInsightDays('14')).toBe(14);
    expect(parseInsightDays('9')).toBe(7);
    expect(parseInsightDays(null)).toBe(7);
    expect(parseInsightView('failures')).toBe('failures');
    expect(parseInsightView('nope')).toBe('overview');
  });

  it('derives today in Beijing time', () => {
    // 2026-09-11T20:00Z 已经是北京时间 12 日
    expect(beijingToday(Date.UTC(2026, 8, 11, 20))).toBe('2026-09-12');
    expect(beijingToday(Date.UTC(2026, 8, 11, 15))).toBe('2026-09-11');
  });
});

describe('rankCounts', () => {
  it('sorts by count desc, then by name, dropping empty entries', () => {
    expect(rankCounts({ b: 2, a: 2, c: 5, d: 0, e: Number.NaN })).toEqual([
      { key: 'c', count: 5, percent: (5 / 9) * 100 },
      { key: 'a', count: 2, percent: (2 / 9) * 100 },
      { key: 'b', count: 2, percent: (2 / 9) * 100 },
    ]);
    expect(rankCounts(undefined)).toEqual([]);
  });
});

describe('summarizeTraffic', () => {
  const days: AppTrafficDay[] = [
    trafficDay({
      date: '2026-09-12',
      requests: 100,
      dau: 40,
      hourly: [5, 95],
      hit: { uptodate: 80, hdiff: 10, blocked: 10 },
      ipVersion: { v4: 90, v6: 10 },
      hosts: { 'a.example': 100 },
      carriers: { 电信: 60, unknown: 40 },
      packages: [{ packageVersion: '1.0', requests: 100, devices: 30 }],
    }),
    trafficDay({
      date: '2026-09-11',
      requests: 200,
      dau: 60,
      hourly: [10],
      hit: { uptodate: 150, pdiff: 40, unknown_package: 10 },
      ipVersion: { v4: 200 },
      hosts: { 'a.example': 150, 'b.example': 50 },
      carriers: { 电信: 200 },
      packages: [
        { packageVersion: '1.0', requests: 150, devices: 50 },
        { packageVersion: '0.9', requests: 50, devices: 0 },
      ],
    }),
    trafficDay({ date: '2026-09-10', requests: 0, dau: 0 }),
  ];

  it('folds the window into totals, shares and rankings', () => {
    const summary = summarizeTraffic(days, '2026-09-12');
    expect(summary.requests).toBe(300);
    expect(summary.today?.date).toBe('2026-09-12');
    expect(summary.today?.requests).toBe(100);
    // 日均只算已完成的日子（含请求为 0 的那天）
    expect(summary.completedDays).toBe(2);
    expect(summary.averageDailyRequests).toBe(100);
    expect(summary.peakDau).toBe(60);
    expect(summary.averageDau).toBe(50);
    expect(summary.hit.uptodate).toBe(230);
    expect(summary.hit.blocked).toBe(10);
    expect(summary.hit.unknown_package).toBe(10);
    near(summary.refusedPercent, (20 / 300) * 100);
    near(summary.updatePercent, (50 / 300) * 100);
    expect(summary.hourly[0]).toBe(15);
    expect(summary.hourly[1]).toBe(95);
    expect(summary.hourly[23]).toBe(0);
    expect(summary.ipVersion[0]).toEqual({
      key: 'v4',
      count: 290,
      percent: (290 / 300) * 100,
    });
    expect(summary.hosts.map((item) => item.key)).toEqual([
      'a.example',
      'b.example',
    ]);
    expect(summary.carriers[0]).toMatchObject({ key: '电信', count: 260 });
    // 设备数不能跨日相加，取单日峰值
    expect(summary.packages).toEqual([
      {
        packageVersion: '1.0',
        requests: 250,
        peakDevices: 50,
        percent: (250 / 300) * 100,
      },
      {
        packageVersion: '0.9',
        requests: 50,
        peakDevices: 0,
        percent: (50 / 300) * 100,
      },
    ]);
    expect(summary.daily.map((day) => day.date)).toEqual([
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);
    expect(summary.daily[2]?.isToday).toBe(true);
  });

  it('is empty-safe', () => {
    const summary = summarizeTraffic(undefined);
    expect(summary.requests).toBe(0);
    expect(summary.today).toBeNull();
    expect(summary.averageDailyRequests).toBe(0);
    expect(summary.hourly).toHaveLength(24);
    expect(summary.packages).toEqual([]);
  });

  it('flags the refusals that explain missing updates', () => {
    const summary = summarizeTraffic(days, '2026-09-12');
    expect(trafficWarnings(summary.hit)).toEqual([
      'blocked',
      'unknown_package',
    ]);
    expect(trafficWarnings(summarizeTraffic([]).hit)).toEqual([]);
  });
});

describe('funnel', () => {
  it('computes rates and health from event counts', () => {
    const rates = computeFunnelRates({
      downloadSuccess: 100,
      downloadFail: 5,
      patchFail: 3,
      markSuccess: 90,
      rollback: 10,
    });
    near(rates.downloadSuccessRate, 100 / 105);
    near(rates.rollbackRate, 0.1);
    expect(rates.failures).toBe(8);
    expect(rates.health).toBe('critical');

    expect(
      computeFunnelRates({
        downloadSuccess: 0,
        downloadFail: 0,
        patchFail: 0,
        markSuccess: 3,
        rollback: 1,
      }),
    ).toMatchObject({
      downloadSuccessRate: null,
      // 样本不足不判定
      health: null,
    });
    expect(
      computeFunnelRates({
        downloadSuccess: 50,
        downloadFail: 0,
        patchFail: 0,
        markSuccess: 50,
        rollback: 0,
      }).health,
    ).toBe('healthy');
  });

  it('adds served totals, coverage and the deleted flag per version', () => {
    const response: VersionFunnelResponse = {
      days: 7,
      start: '2026-09-05',
      end: '2026-09-11',
      hourlyFrom: '2026-09-10',
      dauToday: 200,
      versions: [
        {
          hash: 'abc',
          name: '1.2.3',
          served: { hdiff: 10, pdiff: 5, full: 1, fullPending: 2, exp: 0 },
          events: {
            downloadSuccess: 15,
            downloadFail: 0,
            patchFail: 0,
            markSuccess: 12,
            rollback: 0,
          },
          adopted: { mark: 50, download: 60 },
          lag: { downloadSuccess: { lt1h: 10 }, markSuccess: null },
          byPackage: [],
        },
        {
          hash: 'def',
          name: null,
          served: { hdiff: 0, pdiff: 0, full: 0, fullPending: 0, exp: 0 },
          events: {
            downloadSuccess: 0,
            downloadFail: 0,
            patchFail: 0,
            markSuccess: 0,
            rollback: 0,
          },
          adopted: { mark: 0, download: 0 },
          lag: { downloadSuccess: null, markSuccess: null },
          byPackage: [],
        },
      ],
    };
    const rows = buildFunnelRows(response);
    expect(rows[0]).toMatchObject({
      servedTotal: 18,
      coverage: 0.25,
      deleted: false,
    });
    // 累计激活率用两个累计设备数，与窗口无关，也不会结构性地超过 100%
    near(rows[0]?.adoptionRate, 50 / 60);
    expect(rows[1]).toMatchObject({
      servedTotal: 0,
      deleted: true,
      adoptionRate: null,
    });
    expect(
      buildFunnelRows({ ...response, dauToday: 0 })[0]?.coverage,
    ).toBeNull();
    expect(buildFunnelRows(undefined)).toEqual([]);
  });

  it('expands lag buckets in fixed order with shares', () => {
    const { total, shares } = lagShares({ lt1h: 30, '6h-24h': 10 });
    expect(total).toBe(40);
    expect(shares.map((share) => share.bucket)).toEqual([
      'lt1h',
      '1h-6h',
      '6h-24h',
      '1d-3d',
      '3d-7d',
      'gt7d',
    ]);
    expect(shares[0]?.percent).toBe(75);
    expect(shares[1]?.count).toBe(0);
    expect(lagShares(null).total).toBe(0);
  });
});

describe('summarizeBreakdown', () => {
  const days: AppEventBreakdownDay[] = [
    {
      date: '2026-09-12',
      byOS: [
        {
          type: 'download_success',
          hash: 'v1',
          name: '1.0',
          os: 'android',
          count: 90,
        },
        {
          type: 'download_fail',
          hash: 'v1',
          name: '1.0',
          os: 'android',
          count: 10,
        },
        { type: 'mark_success', hash: 'v1', name: '1.0', os: 'ios', count: 40 },
        { type: 'rollback', hash: 'v2', name: null, os: 'ios', count: 2 },
      ],
      byReason: [
        {
          type: 'download_fail',
          hash: 'v1',
          name: '1.0',
          reason: 'network',
          count: 8,
        },
        {
          type: 'download_fail',
          hash: 'v2',
          name: null,
          reason: 'network',
          count: 1,
        },
        {
          type: 'patch_fail',
          hash: 'v1',
          name: '1.0',
          reason: 'other:ENOENT',
          count: 3,
        },
      ],
      byCarrier: [
        { type: 'download_success', carrier: '电信', count: 50 },
        { type: 'download_fail', carrier: '电信', count: 5 },
      ],
    },
    {
      date: '2026-09-11',
      byOS: [],
      byReason: [
        {
          type: 'download_fail',
          hash: 'v1',
          name: '1.0',
          reason: 'timeout',
          count: 4,
        },
      ],
      byCarrier: [],
    },
  ];

  it('ranks reasons with per-version detail and rates per dimension', () => {
    const summary = summarizeBreakdown(days);
    expect(summary.failures).toBe(16);
    expect(summary.reasons.map((row) => [row.reason, row.count])).toEqual([
      ['network', 9],
      ['timeout', 4],
      ['other:ENOENT', 3],
    ]);
    near(summary.reasons[0]?.percent, (9 / 16) * 100);
    expect(summary.reasons[0]?.byType).toEqual({ download_fail: 9 });
    expect(summary.reasons[0]?.versions).toEqual([
      { hash: 'v1', name: '1.0', count: 8 },
      { hash: 'v2', name: null, count: 1 },
    ]);
    expect(summary.os[0]).toMatchObject({
      key: 'android',
      total: 100,
      failureRate: 0.1,
      rollbackRate: null,
    });
    expect(summary.os[1]).toMatchObject({
      key: 'ios',
      rollbackRate: 2 / 42,
    });
    expect(summary.carriers[0]).toMatchObject({
      key: '电信',
      failureRate: 5 / 55,
    });
    expect(summary.versionNames.get('v2')).toBeNull();
    expect(summary.versionNames.get('v1')).toBe('1.0');
  });

  it('filters by version hash and drops the carrier dimension when filtering', () => {
    const summary = summarizeBreakdown(days, 'v2');
    expect(summary.failures).toBe(1);
    expect(summary.reasons).toHaveLength(1);
    expect(summary.os.map((row) => row.key)).toEqual(['ios']);
    expect(summary.carriers).toEqual([]);
  });

  it('is empty-safe', () => {
    expect(summarizeBreakdown(undefined).failures).toBe(0);
  });

  it('separates known reasons from the other:<prefix> bucket', () => {
    expect(parseFailureReason('crc_mismatch')).toEqual({
      kind: 'known',
      reason: 'crc_mismatch',
    });
    expect(parseFailureReason('other:ENOENT')).toEqual({
      kind: 'other',
      detail: 'ENOENT',
    });
    expect(parseFailureReason('weird')).toEqual({
      kind: 'other',
      detail: 'weird',
    });
  });
});
