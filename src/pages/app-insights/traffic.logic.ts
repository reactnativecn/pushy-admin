import {
  addCounts,
  beijingToday,
  countOf,
  deviceObservationCount,
  observationCount,
  percentOf,
  type RankedItem,
  rankCounts,
  validCount,
} from './logic';
import {
  type AppTrafficDay,
  type DeviceStatus,
  HIT_OUTCOMES,
  type HitOutcome,
} from './types';

// 流量汇总：请求、DAU、命中结果、小时分布、网络与系统、原生包与拒绝明细。

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
  /** 最近 7 天各自的 24 小时分布，按日期升序；不跨天相加。 */
  hourlyDays: HourlyDay[];
  ipVersion: RankedItem[];
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
    hourlyDays: hourlyDays
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-HOURLY_DAYS),
    ipVersion: rankCounts(ipVersion),
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
