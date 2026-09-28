// Events, offered targets and retained devices have different populations.
// Do not synthesize conversion rates from independent observation counters.
import {
  CRITICAL_ROLLBACK,
  MIN_EVENT_SAMPLES,
  WARNING_ROLLBACK,
} from '../../constants/metric-thresholds';
import {
  type AppEventBreakdownDay,
  type AppTrafficDay,
  type ClientEventType,
  type DeviceStatus,
  type FunnelEventCounts,
  HIT_OUTCOMES,
  type HitOutcome,
  LAG_BUCKETS,
  type LagBucket,
  type LagBuckets,
  type ObservationStatus,
  type ServedCounts,
  type VersionFunnel,
  type VersionFunnelResponse,
} from './types';

export const INSIGHT_DAY_OPTIONS = [7, 14, 30] as const;
export type InsightDays = (typeof INSIGHT_DAY_OPTIONS)[number];
export const DEFAULT_INSIGHT_DAYS: InsightDays = 7;
export const INSIGHT_VIEWS = [
  'overview',
  'versions',
  'traffic',
  'audience',
  'failures',
] as const;
export type InsightView = (typeof INSIGHT_VIEWS)[number];

export const parseInsightDays = (value: string | null): InsightDays => {
  const parsed = Number(value);
  // 旧链接里的 days=35 落到现在的最大档。
  if (parsed === 35) return 30;
  return INSIGHT_DAY_OPTIONS.includes(parsed as InsightDays)
    ? (parsed as InsightDays)
    : DEFAULT_INSIGHT_DAYS;
};

export const parseInsightView = (value: string | null): InsightView =>
  INSIGHT_VIEWS.includes(value as InsightView)
    ? (value as InsightView)
    : 'overview';

/** Legacy fallback only; prefer window.today in the writer's timezone. */
export const beijingToday = (now: number = Date.now()): string =>
  new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const countOf = (value: unknown): number => (validCount(value) ? value : 0);
const percentOf = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

export const observationCount = (
  value: number | null | undefined,
  status?: ObservationStatus,
): number | null =>
  status === 'unavailable' || !validCount(value) ? null : value;

/** A legacy zero UUID count may mean missing/expired collection, not zero
 * devices. An explicit observed zero is valid and participates in the mean. */
export const deviceObservationCount = (
  value: number | null | undefined,
  status?: ObservationStatus,
): number | null =>
  status === undefined && value === 0 ? null : observationCount(value, status);

export interface RankedItem {
  key: string;
  count: number;
  percent: number;
}

export const rankCounts = (
  counts: Readonly<Record<string, number>> | undefined,
): RankedItem[] => {
  const entries = Object.entries(counts ?? {}).filter(
    ([, count]) => validCount(count) && count > 0,
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return entries
    .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
      rightCount === leftCount
        ? leftKey.localeCompare(rightKey)
        : rightCount - leftCount,
    )
    .map(([key, count]) => ({ key, count, percent: percentOf(count, total) }));
};

const addCounts = (
  target: Record<string, number>,
  source: Readonly<Record<string, number>> | undefined,
) => {
  for (const [key, count] of Object.entries(source ?? {})) {
    if (validCount(count) && count > 0) {
      target[key] = (target[key] ?? 0) + count;
    }
  }
};

export interface DailyTrafficPoint {
  date: string;
  requests: number | null;
  dau: number | null;
  hit: Record<HitOutcome, number>;
  isToday: boolean;
}

export interface PackageTrafficSummary {
  packageVersion: string;
  requests: number | null;
  peakDevices: number | null;
  percent: number | null;
  observedDays: number;
  availableStart: string | null;
  availableEnd: string | null;
  partial: boolean;
  expiredDays: number;
  unavailableDays: number;
}

export type RefusalOutcome = 'blocked' | 'unknown_package';
export interface RefusedPackageSummary {
  packageVersion: string;
  requests: number;
}

export interface TrafficSummary {
  requests: number;
  today: DailyTrafficPoint | null;
  completedDays: number;
  requestSampleDays: number;
  dauSampleDays: number;
  averageDailyRequests: number | null;
  peakDau: number | null;
  averageDau: number | null;
  hit: Record<HitOutcome, number>;
  refusedPercent: number;
  updatePercent: number;
  /** 最近 7 天各自的 24 小时分布，按日期升序；不跨天相加。 */
  hourlyDays: HourlyDay[];
  ipVersion: RankedItem[];
  hosts: RankedItem[];
  carriers: RankedItem[];
  /** 平台（os 标签的第一个词）与系统版本（完整 os 标签）。 */
  platforms: RankedItem[];
  osVersions: RankedItem[];
  /** 服务端是否返回了 os；旧服务端没有这一项。 */
  hasClientInfo: boolean;
  packages: PackageTrafficSummary[];
  refused: Record<RefusalOutcome, RefusedPackageSummary[]>;
  daily: DailyTrafficPoint[];
}

const emptyHit = (): Record<HitOutcome, number> => ({
  uptodate: 0,
  hdiff: 0,
  pdiff: 0,
  full: 0,
  paused: 0,
  expired: 0,
  blocked: 0,
  unknown_package: 0,
});

const rankRefused = (counts: Map<string, number>): RefusedPackageSummary[] =>
  Array.from(counts, ([packageVersion, requests]) => ({
    packageVersion,
    requests,
  })).sort((left, right) =>
    right.requests === left.requests
      ? left.packageVersion.localeCompare(right.packageVersion)
      : right.requests - left.requests,
  );

// Android 客户端上报的是 API level（Platform.Version），换算成系统版本号；
// 同一系统版本的多个 API level（如 12 / 12L）合并。
const ANDROID_API_VERSION: Record<number, string> = {
  21: '5',
  22: '5.1',
  23: '6',
  24: '7',
  25: '7.1',
  26: '8',
  27: '8.1',
  28: '9',
  29: '10',
  30: '11',
  31: '12',
  32: '12',
  33: '13',
  34: '14',
  35: '15',
  36: '16',
};

// 鸿蒙同样上报 API level；对照华为版本说明（HarmonyOS 5.0.0 起）。
const HARMONY_API_VERSION: Record<number, string> = {
  12: '5.0.0',
  13: '5.0.1',
  14: '5.0.2',
  15: '5.0.3',
  16: '5.0.4',
  17: '5.0.5',
  18: '5.1.0',
  19: '5.1.1',
  20: '6.0.0',
  21: '6.0.1',
  22: '6.0.2',
  23: '6.1.0',
  24: '6.1.1',
};

/**
 * 把 SDK 上报的 os 标签归到便于阅读的系统版本：Android API level → 版本号，
 * 鸿蒙 API level → 商业版本号，iOS / tvOS 保留到 minor（17.5.1 → 17.5，18 → 18.0），其余原样。
 */
export const normalizeOSVersion = (label: string): string => {
  const [platform = '', version = ''] = label.split(' ');
  if (!version) return label;
  if (platform === 'android' && /^\d+$/.test(version)) {
    const mapped = ANDROID_API_VERSION[Number(version)];
    return mapped ? `android ${mapped}` : `android API ${version}`;
  }
  if (platform === 'harmony' && /^\d+$/.test(version)) {
    const mapped = HARMONY_API_VERSION[Number(version)];
    return mapped ? `harmony ${mapped}` : `harmony API ${version}`;
  }
  if (platform === 'ios' || platform === 'tvos') {
    const [major, minor = '0'] = version.split('.');
    return `${platform} ${major}.${minor}`;
  }
  return label;
};

export const HOURLY_DAYS = 7;

export interface HourlyDay {
  date: string;
  hourly: number[];
}

/** Both means exclude today, include valid zeroes, and disclose sample days.
 * Unavailable values are not zero. Daily device estimates cannot be added;
 * merging retained original HLLs would require a different server API. */
export const summarizeTraffic = (
  days: readonly AppTrafficDay[] | undefined,
  today: string = beijingToday(),
): TrafficSummary => {
  const hit = emptyHit();
  const hourlyDays: HourlyDay[] = [];
  const ipVersion: Record<string, number> = {};
  const hosts: Record<string, number> = {};
  const carriers: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const osVersions: Record<string, number> = {};
  let hasClientInfo = false;
  const packages = new Map<string, PackageTrafficSummary>();
  const refused: Record<RefusalOutcome, Map<string, number>> = {
    blocked: new Map(),
    unknown_package: new Map(),
  };
  const daily: DailyTrafficPoint[] = [];
  let requests = 0;
  let completedDays = 0;
  let requestSampleDays = 0;
  let dauSampleDays = 0;
  let completedRequests = 0;
  let completedDau = 0;
  let peakDau: number | null = null;

  for (const day of days ?? []) {
    const dayRequests = observationCount(day.requests, day.requestsStatus);
    const dayHit = emptyHit();
    // Ratios must share the same available request-day population. Hourly,
    // host and UUID observations remain separate, self-denominated series.
    if (dayRequests !== null) {
      for (const outcome of HIT_OUTCOMES) {
        dayHit[outcome] = countOf(day.hit?.[outcome]);
        hit[outcome] += dayHit[outcome];
      }
    }
    const dau = deviceObservationCount(day.dau, day.dauStatus);
    requests += dayRequests ?? 0;
    if (dau !== null) peakDau = Math.max(peakDau ?? 0, dau);
    if (day.date < today) {
      completedDays += 1;
      if (dayRequests !== null) {
        completedRequests += dayRequests;
        requestSampleDays += 1;
      }
      if (dau !== null) {
        completedDau += dau;
        dauSampleDays += 1;
      }
    }
    const hourly = new Array<number>(24).fill(0);
    (day.hourly ?? []).forEach((count, hour) => {
      if (hour < 24) hourly[hour] = countOf(count);
    });
    hourlyDays.push({ date: day.date, hourly });
    addCounts(ipVersion, day.ipVersion);
    addCounts(hosts, day.hosts);
    addCounts(carriers, day.carriers);
    if (day.os) hasClientInfo = true;
    for (const [label, count] of Object.entries(day.os ?? {})) {
      if (validCount(count) && count > 0) {
        const platform = label.split(' ')[0] || 'unknown';
        platforms[platform] = (platforms[platform] ?? 0) + count;
        const version = normalizeOSVersion(label);
        osVersions[version] = (osVersions[version] ?? 0) + count;
      }
    }
    for (const item of day.packages ?? []) {
      const entry: PackageTrafficSummary = packages.get(
        item.packageVersion,
      ) ?? {
        packageVersion: item.packageVersion,
        requests: null,
        peakDevices: null,
        percent: 0,
        observedDays: 0,
        availableStart: null,
        availableEnd: null,
        partial: false,
        expiredDays: 0,
        unavailableDays: 0,
      };
      if (dayRequests !== null && validCount(item.requests)) {
        entry.requests = (entry.requests ?? 0) + item.requests;
      }
      const status: DeviceStatus =
        item.devicesStatus ??
        (validCount(item.devices) && item.devices > 0
          ? 'observed'
          : 'unavailable');
      if (
        (status === 'observed' || status === 'partial') &&
        validCount(item.devices)
      ) {
        entry.peakDevices = Math.max(entry.peakDevices ?? 0, item.devices);
        entry.observedDays += 1;
        entry.availableStart =
          entry.availableStart === null || day.date < entry.availableStart
            ? day.date
            : entry.availableStart;
        entry.availableEnd =
          entry.availableEnd === null || day.date > entry.availableEnd
            ? day.date
            : entry.availableEnd;
      } else if (status === 'expired') {
        entry.expiredDays += 1;
      } else {
        entry.unavailableDays += 1;
      }
      entry.partial ||=
        status === 'partial' || day.packageDevicesLimited === true;
      packages.set(item.packageVersion, entry);
    }
    for (const item of dayRequests === null ? [] : (day.refused ?? [])) {
      const target = refused[item.outcome];
      if (target && validCount(item.requests) && item.requests > 0) {
        target.set(
          item.packageVersion,
          (target.get(item.packageVersion) ?? 0) + item.requests,
        );
      }
    }
    daily.push({
      date: day.date,
      requests: dayRequests,
      dau,
      hit: dayHit,
      isToday: day.date === today,
    });
  }
  daily.sort((left, right) => left.date.localeCompare(right.date));
  return {
    requests,
    today: daily.find((day) => day.isToday) ?? null,
    completedDays,
    requestSampleDays,
    dauSampleDays,
    averageDailyRequests:
      requestSampleDays > 0 ? completedRequests / requestSampleDays : null,
    averageDau: dauSampleDays > 0 ? completedDau / dauSampleDays : null,
    peakDau,
    hit,
    refusedPercent: percentOf(hit.blocked + hit.unknown_package, requests),
    updatePercent: percentOf(hit.hdiff + hit.pdiff + hit.full, requests),
    hourlyDays: hourlyDays
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-HOURLY_DAYS),
    ipVersion: rankCounts(ipVersion),
    hosts: rankCounts(hosts),
    carriers: rankCounts(carriers),
    platforms: rankCounts(platforms),
    osVersions: rankCounts(osVersions),
    hasClientInfo,
    packages: Array.from(packages.values())
      .map((entry) => ({
        ...entry,
        percent:
          entry.requests !== null && requests > 0
            ? percentOf(entry.requests, requests)
            : null,
      }))
      .sort(
        (left, right) =>
          (right.requests ?? 0) - (left.requests ?? 0) ||
          left.packageVersion.localeCompare(right.packageVersion),
      ),
    refused: {
      blocked: rankRefused(refused.blocked),
      unknown_package: rankRefused(refused.unknown_package),
    },
    daily,
  };
};

export const trafficWarnings = (
  hit: Readonly<Record<HitOutcome, number>>,
): Array<'blocked' | 'unknown_package'> => {
  const warnings: Array<'blocked' | 'unknown_package'> = [];
  if (hit.blocked > 0) warnings.push('blocked');
  if (hit.unknown_package > 0) warnings.push('unknown_package');
  return warnings;
};

export const servedTotal = (served: ServedCounts | undefined) =>
  served
    ? countOf(served.hdiff) +
      countOf(served.pdiff) +
      countOf(served.full) +
      countOf(served.fullPending) +
      countOf(served.exp)
    : 0;

// Legacy enum identifiers for shared key mappings; rollback reports ONLY.
export type FunnelHealth = 'healthy' | 'warning' | 'critical' | null;
export { MIN_EVENT_SAMPLES };

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

export const shortHash = (hash: string) =>
  hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;

export const FAILURE_EVENT_TYPES: ReadonlySet<ClientEventType> = new Set([
  'download_fail',
  'patch_fail',
  'rollback',
]);
// Rollbacks are reported without an error detail, so only download and
// patch failures carry a classified reason.
const REASON_EVENT_TYPES: ReadonlySet<ClientEventType> = new Set([
  'download_fail',
  'patch_fail',
]);
export type EventTypeCounts = Record<ClientEventType, number>;
const emptyEventCounts = (): EventTypeCounts => ({
  download_success: 0,
  download_fail: 0,
  patch_fail: 0,
  rollback: 0,
  mark_success: 0,
});

export interface DimensionRow {
  key: string;
  counts: EventTypeCounts;
  total: number;
  failureRate: number | null;
  rollbackRate: number | null;
  failureSamples: number;
  rollbackSamples: number;
}

const finishDimensionRow = (
  key: string,
  counts: EventTypeCounts,
): DimensionRow => {
  const failureSamples =
    counts.download_success + counts.download_fail + counts.patch_fail;
  const rollbackSamples = counts.mark_success + counts.rollback;
  return {
    key,
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    failureRate:
      failureSamples > 0
        ? (counts.download_fail + counts.patch_fail) / failureSamples
        : null,
    rollbackRate:
      rollbackSamples > 0 ? counts.rollback / rollbackSamples : null,
    failureSamples,
    rollbackSamples,
  };
};

export const highestFailureDimension = (rows: readonly DimensionRow[]) =>
  [...rows]
    .filter(
      (row) =>
        row.failureSamples >= MIN_EVENT_SAMPLES && (row.failureRate ?? 0) > 0,
    )
    .sort(
      (left, right) =>
        (right.failureRate ?? 0) - (left.failureRate ?? 0) ||
        right.failureSamples - left.failureSamples ||
        left.key.localeCompare(right.key),
    )[0] ?? null;

export interface ReasonVersion {
  hash: string;
  name: string | null;
  count: number;
}
export interface ReasonRow {
  reason: string;
  count: number;
  percent: number;
  byType: Partial<Record<ClientEventType, number>>;
  versions: ReasonVersion[];
}
export interface BreakdownSummary {
  totalDays: number;
  availableDays: number;
  unavailableDays: number;
  legacyDays: number;
  failures: number;
  reasons: ReasonRow[];
  os: DimensionRow[];
  carriers: DimensionRow[];
  versionNames: Map<string, string | null>;
}

export const summarizeBreakdown = (
  days: readonly AppEventBreakdownDay[] | undefined,
  hashFilter?: string,
): BreakdownSummary => {
  const reasons = new Map<
    string,
    {
      count: number;
      byType: Partial<Record<ClientEventType, number>>;
      versions: Map<string, ReasonVersion>;
    }
  >();
  const os = new Map<string, EventTypeCounts>();
  const carriers = new Map<string, EventTypeCounts>();
  const versionNames = new Map<string, string | null>();
  let failures = 0;
  let availableDays = 0;
  let unavailableDays = 0;
  let legacyDays = 0;
  for (const day of days ?? []) {
    if (day.status === undefined) legacyDays += 1;
    const legacyHasReports = [
      ...(day.byReason ?? []),
      ...(day.byOS ?? []),
      ...(day.byCarrier ?? []),
    ].some((item) => validCount(item.count) && item.count > 0);
    // Availability belongs to the unfiltered bucket, not to the selected
    // version. Explicit unavailable always wins over leftover numeric fields.
    if (
      day.status === 'unavailable' ||
      (day.status !== 'observed' && !legacyHasReports)
    ) {
      unavailableDays += 1;
      continue;
    }
    availableDays += 1;
    for (const item of day.byReason ?? []) {
      if (hashFilter && item.hash !== hashFilter) continue;
      if (
        !validCount(item.count) ||
        item.count <= 0 ||
        !REASON_EVENT_TYPES.has(item.type)
      ) {
        continue;
      }
      failures += item.count;
      if (!versionNames.has(item.hash) || item.name !== null) {
        versionNames.set(item.hash, item.name);
      }
      const parsed = parseFailureReason(item.reason);
      const reason = parsed.kind === 'known' ? parsed.reason : 'other';
      const entry = reasons.get(reason) ?? {
        count: 0,
        byType: {} as Partial<Record<ClientEventType, number>>,
        versions: new Map<string, ReasonVersion>(),
      };
      entry.count += item.count;
      entry.byType[item.type] = (entry.byType[item.type] ?? 0) + item.count;
      const version = entry.versions.get(item.hash) ?? {
        hash: item.hash,
        name: item.name,
        count: 0,
      };
      version.count += item.count;
      if (item.name !== null) version.name = item.name;
      entry.versions.set(item.hash, version);
      reasons.set(reason, entry);
    }
    for (const item of day.byOS ?? []) {
      if (hashFilter && item.hash !== hashFilter) continue;
      if (!validCount(item.count) || item.count <= 0) continue;
      if (!versionNames.has(item.hash) || item.name !== null) {
        versionNames.set(item.hash, item.name);
      }
      const counts = os.get(item.os) ?? emptyEventCounts();
      if (Object.hasOwn(counts, item.type)) counts[item.type] += item.count;
      os.set(item.os, counts);
    }
    if (hashFilter) continue;
    for (const item of day.byCarrier ?? []) {
      if (!validCount(item.count) || item.count <= 0) continue;
      const counts = carriers.get(item.carrier) ?? emptyEventCounts();
      if (Object.hasOwn(counts, item.type)) counts[item.type] += item.count;
      carriers.set(item.carrier, counts);
    }
  }
  const byCount = (a: DimensionRow, b: DimensionRow) =>
    b.total - a.total || a.key.localeCompare(b.key);
  return {
    totalDays: days?.length ?? 0,
    availableDays,
    unavailableDays,
    legacyDays,
    failures,
    reasons: Array.from(reasons, ([reason, entry]) => ({
      reason,
      count: entry.count,
      percent: percentOf(entry.count, failures),
      byType: entry.byType,
      versions: Array.from(entry.versions.values()).sort(
        (a, b) => b.count - a.count || a.hash.localeCompare(b.hash),
      ),
    })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    os: Array.from(os, ([key, counts]) => finishDimensionRow(key, counts)).sort(
      byCount,
    ),
    carriers: Array.from(carriers, ([key, counts]) =>
      finishDimensionRow(key, counts),
    ).sort(byCount),
    versionNames,
  };
};

export const KNOWN_FAILURE_REASONS = [
  'empty',
  'crc_mismatch',
  'patch_apply',
  'no_space',
  'timeout',
  'network',
  'http_4xx',
  'http_5xx',
  'file_io',
  'zip',
  'bundle_mismatch',
] as const;
export type KnownFailureReason = (typeof KNOWN_FAILURE_REASONS)[number];

export const parseFailureReason = (
  reason: string,
): { kind: 'known'; reason: KnownFailureReason } | { kind: 'other' } =>
  KNOWN_FAILURE_REASONS.includes(reason as KnownFailureReason)
    ? { kind: 'known', reason: reason as KnownFailureReason }
    : { kind: 'other' };

export const KNOWN_CARRIERS = [
  '电信',
  '联通',
  '移动',
  '广电',
  '教育网',
  '云',
  '其他',
  '其他地区',
  'unknown',
] as const;
export type KnownCarrier = (typeof KNOWN_CARRIERS)[number];
export const isKnownCarrier = (carrier: string): carrier is KnownCarrier =>
  KNOWN_CARRIERS.includes(carrier as KnownCarrier);
