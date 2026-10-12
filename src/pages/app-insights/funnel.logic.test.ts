import { describe, expect, it } from 'bun:test';
import {
  buildFunnelRows,
  buildPackageRows,
  computeFunnelRates,
  lagShares,
  versionTotals,
} from './funnel.logic';
import type {
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
  it('pivots versions into native package rows with traffic context', () => {
    const second = {
      ...version(),
      hash: 'v2',
      name: 'Version 2',
      byPackage: [
        {
          packageVersion: '1.0',
          served: { ...offered, hdiff: 3 },
          events: events({ markSuccess: 4, rollback: 1 }),
        },
        {
          packageVersion: '2.0',
          served: offered,
          events: events({ markSuccess: 1 }),
        },
      ],
    };
    const rows = buildPackageRows(
      buildFunnelRows(response({ versions: [version(), second] })),
      [
        {
          packageVersion: '2.0',
          requests: 50,
          percent: 50,
          peakDevices: 9,
          observedDays: 1,
          availableStart: null,
          availableEnd: null,
          partial: false,
          expiredDays: 0,
          unavailableDays: 0,
        },
        {
          packageVersion: '3.0',
          requests: 10,
          percent: 10,
          peakDevices: null,
          observedDays: 0,
          availableStart: null,
          availableEnd: null,
          partial: false,
          expiredDays: 0,
          unavailableDays: 0,
        },
      ],
    );
    expect(rows.map((row) => row.packageVersion)).toEqual([
      '2.0',
      '3.0',
      '1.0',
    ]);
    const one = rows.find((row) => row.packageVersion === '1.0')!;
    expect(one.events.markSuccess).toBe(6);
    expect(one.events.rollback).toBe(1);
    expect(one.requests).toBeNull();
    expect(one.versions.map((item) => item.hash)).toEqual(['v2', 'v1']);
    expect(rows[1]?.versions).toEqual([]);
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
