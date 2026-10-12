/** 版本健康页的纯逻辑：解析事件分类、按版本汇总、生成趋势折线数据 */

// 分类字符串形如 `type␟version␟encodeURIComponent(packageVersion)`，旧数据没有第三段
export const CATEGORY_SEPARATOR = '\u001f';

export const EVENT_TYPES = [
  'download_success',
  'download_fail',
  'patch_fail',
  'rollback',
  'mark_success',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const FAIL_TYPES: ReadonlySet<EventType> = new Set([
  'download_fail',
  'patch_fail',
  'rollback',
]);

export interface VersionHealthRow {
  version: string;
  packageVersion: string;
  counts: Record<EventType, number>;
  rollbackRate: number | null;
  downloadFailRate: number | null;
  total: number;
}

export interface TrendPoint {
  time: string;
  value: number;
  category: string;
}

export interface AppEventsMetrics {
  dict: string[];
  data: Array<{ time: string; data: Array<[number, number]> }>;
}

/** 解析一条分类；类型未知、缺版本或包版本解码失败时返回 null */
export function parseEventCategory(raw: string): {
  type: EventType;
  version: string;
  packageVersion: string;
} | null {
  const firstSeparator = raw.indexOf(CATEGORY_SEPARATOR);
  if (firstSeparator < 0) {
    return null;
  }
  const secondSeparator = raw.indexOf(CATEGORY_SEPARATOR, firstSeparator + 1);
  const type = raw.slice(0, firstSeparator) as EventType;
  const version = raw.slice(
    firstSeparator + 1,
    secondSeparator < 0 ? undefined : secondSeparator,
  );
  if (!EVENT_TYPES.includes(type) || !version) {
    return null;
  }
  if (secondSeparator < 0) {
    return { type, version, packageVersion: 'unknown' };
  }
  try {
    return {
      type,
      version,
      packageVersion:
        decodeURIComponent(raw.slice(secondSeparator + 1)) || 'unknown',
    };
  } catch {
    return null;
  }
}

const emptyCounts = (): Record<EventType, number> => ({
  download_success: 0,
  download_fail: 0,
  patch_fail: 0,
  rollback: 0,
  mark_success: 0,
});

/**
 * 把接口返回的分桶数据汇总成表格行（按 版本 + 原生包版本）和趋势点（按 时间 + 事件类型）。
 * 表格按回滚率降序、总数降序；没有启动样本的版本排在最后。
 */
export function buildVersionHealth(
  metrics: AppEventsMetrics | undefined,
  eventTypeLabels: Record<EventType, string>,
): { rows: VersionHealthRow[]; trendData: TrendPoint[] } {
  const versionCounts = new Map<
    string,
    {
      version: string;
      packageVersion: string;
      counts: Record<EventType, number>;
    }
  >();
  const trendTotals = new Map<string, Map<EventType, number>>();
  if (metrics?.data && metrics.dict) {
    for (const bucket of metrics.data) {
      for (const [dictIndex, count] of bucket.data) {
        const parsed = parseEventCategory(metrics.dict[dictIndex] || '');
        if (!parsed) {
          continue;
        }
        const rowKey = JSON.stringify([parsed.version, parsed.packageVersion]);
        let versionEntry = versionCounts.get(rowKey);
        if (!versionEntry) {
          versionEntry = {
            version: parsed.version,
            packageVersion: parsed.packageVersion,
            counts: emptyCounts(),
          };
          versionCounts.set(rowKey, versionEntry);
        }
        versionEntry.counts[parsed.type] += count;

        let bucketTotals = trendTotals.get(bucket.time);
        if (!bucketTotals) {
          bucketTotals = new Map();
          trendTotals.set(bucket.time, bucketTotals);
        }
        bucketTotals.set(
          parsed.type,
          (bucketTotals.get(parsed.type) || 0) + count,
        );
      }
    }
  }

  const rows: VersionHealthRow[] = [...versionCounts.values()].map(
    ({ version, packageVersion, counts }) => {
      const startSamples = counts.rollback + counts.mark_success;
      const downloadSamples = counts.download_fail + counts.download_success;
      return {
        version,
        packageVersion,
        counts,
        rollbackRate: startSamples > 0 ? counts.rollback / startSamples : null,
        downloadFailRate:
          downloadSamples > 0 ? counts.download_fail / downloadSamples : null,
        total: EVENT_TYPES.reduce((sum, type) => sum + counts[type], 0),
      };
    },
  );
  rows.sort(
    (a, b) =>
      (b.rollbackRate ?? -1) - (a.rollbackRate ?? -1) || b.total - a.total,
  );

  const trendData: TrendPoint[] = [];
  for (const [time, bucketTotals] of trendTotals) {
    for (const [type, value] of bucketTotals) {
      trendData.push({ time, value, category: eventTypeLabels[type] });
    }
  }
  trendData.sort((a, b) => a.time.localeCompare(b.time));

  return { rows, trendData };
}
