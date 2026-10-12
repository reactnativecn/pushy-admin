// Events, offered targets and retained devices have different populations.
// Do not synthesize conversion rates from independent observation counters.
import {
  CRITICAL_ROLLBACK,
  MIN_EVENT_SAMPLES,
  WARNING_ROLLBACK,
} from '@/constants/metric-thresholds';
import { countOf, type FunnelHealth, percentOf, validCount } from './logic';
import type { PackageTrafficSummary } from './traffic.logic';
import {
  type FunnelEventCounts,
  LAG_BUCKETS,
  type LagBucket,
  type LagBuckets,
  type ServedCounts,
  type VersionFunnel,
  type VersionFunnelResponse,
} from './types';

export const servedTotal = (served: ServedCounts | undefined) =>
  served
    ? countOf(served.hdiff) +
      countOf(served.pdiff) +
      countOf(served.full) +
      countOf(served.fullPending) +
      countOf(served.exp)
    : 0;

export interface FunnelRates {
  downloadSuccessRate: number | null;
  rollbackRate: number | null;
  downloadSamples: number;
  rollbackSamples: number;
  failures: number;
  health: FunnelHealth;
}

export const computeFunnelRates = (events: FunnelEventCounts): FunnelRates => {
  const downloadSamples =
    countOf(events.downloadSuccess) + countOf(events.downloadFail);
  const rollbackSamples =
    countOf(events.markSuccess) + countOf(events.rollback);
  const rollbackRate =
    rollbackSamples > 0 ? countOf(events.rollback) / rollbackSamples : null;
  const health: FunnelHealth =
    rollbackSamples < MIN_EVENT_SAMPLES || rollbackRate === null
      ? null
      : rollbackRate >= CRITICAL_ROLLBACK
        ? 'critical'
        : rollbackRate >= WARNING_ROLLBACK
          ? 'warning'
          : 'healthy';
  return {
    downloadSuccessRate:
      downloadSamples > 0
        ? countOf(events.downloadSuccess) / downloadSamples
        : null,
    rollbackRate,
    downloadSamples,
    rollbackSamples,
    failures: countOf(events.downloadFail) + countOf(events.patchFail),
    health,
  };
};

export interface RetainedObservations {
  mark: number | null;
  download: number | null;
  lag: LagBuckets;
}

export interface FunnelRow extends VersionFunnel, FunnelRates {
  servedTotal: number;
  retained: RetainedObservations | null;
  deleted: boolean;
}

export const buildFunnelRows = (
  response: VersionFunnelResponse | undefined,
): FunnelRow[] =>
  (response?.versions ?? []).map((version) => {
    const retainedCount = (kind: 'mark' | 'download') => {
      // Explicit null is authoritative; never fall through to legacy data.
      const value =
        version.observed === undefined
          ? version.adopted[kind]
          : version.observed?.[kind];
      return validCount(value) && value > 0 ? value : null;
    };
    return {
      ...version,
      ...computeFunnelRates(version.events),
      servedTotal: servedTotal(version.served),
      retained: {
        mark: retainedCount('mark'),
        download: retainedCount('download'),
        lag: version.lag,
      },
      deleted: version.name === null,
    };
  });

/** Order only the returned candidates, without mutating cached API data. */
export const rankFunnelRows = (rows: readonly FunnelRow[]): FunnelRow[] => {
  const volume = (row: FunnelRow) =>
    row.servedTotal +
    Object.values(row.events).reduce((sum, value) => sum + countOf(value), 0);
  return [...rows].sort(
    (left, right) =>
      volume(right) - volume(left) ||
      (left.hash < right.hash ? -1 : left.hash > right.hash ? 1 : 0),
  );
};

/** 原生包视角下，某个原生包里各热更版本的事件。 */
export interface PackageVersionRow extends FunnelRates {
  hash: string;
  name: string | null | undefined;
  served: ServedCounts;
  events: FunnelEventCounts;
  servedTotal: number;
}

/** 原生包视角的一行：请求与设备来自流量，事件由各热更版本按原生包拆分汇总。 */
export interface PackageRow extends FunnelRates {
  packageVersion: string;
  requests: number | null;
  percent: number | null;
  peakDevices: number | null;
  served: ServedCounts;
  events: FunnelEventCounts;
  servedTotal: number;
  versions: PackageVersionRow[];
}

const SERVED_KEYS = ['hdiff', 'pdiff', 'full', 'fullPending', 'exp'] as const;
const EVENT_KEYS = [
  'downloadSuccess',
  'downloadFail',
  'patchFail',
  'markSuccess',
  'rollback',
] as const;

export const buildPackageRows = (
  versions: readonly FunnelRow[],
  traffic: readonly PackageTrafficSummary[],
): PackageRow[] => {
  const rows = new Map<string, PackageRow>();
  const rowOf = (packageVersion: string): PackageRow => {
    let row = rows.get(packageVersion);
    if (!row) {
      row = {
        packageVersion,
        requests: null,
        percent: null,
        peakDevices: null,
        served: { hdiff: 0, pdiff: 0, full: 0, fullPending: 0, exp: 0 },
        events: {
          downloadSuccess: 0,
          downloadFail: 0,
          patchFail: 0,
          markSuccess: 0,
          rollback: 0,
        },
        servedTotal: 0,
        versions: [],
        ...computeFunnelRates({
          downloadSuccess: 0,
          downloadFail: 0,
          patchFail: 0,
          markSuccess: 0,
          rollback: 0,
        }),
      };
      rows.set(packageVersion, row);
    }
    return row;
  };
  for (const item of traffic) {
    Object.assign(rowOf(item.packageVersion), {
      requests: item.requests,
      percent: item.percent,
      peakDevices: item.peakDevices,
    });
  }
  for (const version of versions) {
    for (const item of version.byPackage) {
      const row = rowOf(item.packageVersion);
      for (const key of SERVED_KEYS) {
        row.served[key] += countOf(item.served[key]);
      }
      for (const key of EVENT_KEYS) {
        row.events[key] += countOf(item.events[key]);
      }
      row.versions.push({
        hash: version.hash,
        name: version.name,
        served: item.served,
        events: item.events,
        servedTotal: servedTotal(item.served),
        ...computeFunnelRates(item.events),
      });
    }
  }
  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      ...computeFunnelRates(row.events),
      servedTotal: servedTotal(row.served),
      versions: row.versions.sort(
        (a, b) =>
          b.servedTotal +
          b.events.markSuccess -
          (a.servedTotal + a.events.markSuccess),
      ),
    }))
    .sort(
      (a, b) =>
        (b.requests ?? 0) - (a.requests ?? 0) ||
        b.servedTotal - a.servedTotal ||
        a.packageVersion.localeCompare(b.packageVersion),
    );
};

export const versionTotals = (response: VersionFunnelResponse | undefined) => {
  if (!response) return null;
  if (response.summary) {
    return { ...response.summary, scope: 'all_observed' as const };
  }
  const events: FunnelEventCounts = {
    downloadSuccess: 0,
    downloadFail: 0,
    patchFail: 0,
    markSuccess: 0,
    rollback: 0,
  };
  let offeredTargets = 0;
  for (const row of response.versions) {
    offeredTargets += servedTotal(row.served);
    for (const key of Object.keys(events) as (keyof FunnelEventCounts)[]) {
      events[key] += countOf(row.events[key]);
    }
  }
  return {
    versionCount: response.versions.length,
    offeredTargets,
    events,
    unattributed: null,
    unattributedOffers: null,
    scope: 'returned_versions' as const,
  };
};

export interface LagShare {
  bucket: LagBucket;
  count: number;
  percent: number;
}

export const lagShares = (
  buckets: Partial<Record<LagBucket, number>> | null | undefined,
): { total: number; shares: LagShare[] } => {
  const total = LAG_BUCKETS.reduce(
    (sum, bucket) => sum + countOf(buckets?.[bucket]),
    0,
  );
  return {
    total,
    shares: LAG_BUCKETS.map((bucket) => {
      const count = countOf(buckets?.[bucket]);
      return { bucket, count, percent: percentOf(count, total) };
    }),
  };
};
