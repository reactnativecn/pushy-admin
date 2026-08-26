import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

/** 全站指标页的纯逻辑:URL 参数解析、总量统计、类别拆分 */

export type MetricMode = 'pv' | 'uv';
export type MetricKeyPrefix = 'rn' | 'os' | 'rnu';

export interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
  sharePercent?: number;
}

export interface MetricsResponse {
  dict: string[];
  data: Array<{ time: string; data: Array<[number, number]> }>;
}

export const TOTAL_SERIES_LABEL = 'total';
export const DEFAULT_RANGE_HOURS = 24;

export const getModeLabels = (
  t: (key: string) => string,
): Record<MetricMode, string> => ({
  pv: t('admin_metrics.mode_requests'),
  uv: t('admin_metrics.mode_users'),
});

export const metricKeyOptions = [
  { label: 'rn', value: 'rn' },
  { label: 'os', value: 'os' },
  { label: 'rnu', value: 'rnu' },
] satisfies Array<{ label: string; value: MetricKeyPrefix }>;

export const getCategoryPrefix = (category: string) => {
  const separatorIndex = category.indexOf(':');
  if (separatorIndex === -1) return category.trim();
  return category.slice(0, separatorIndex).trim();
};

// 服务端给了 _total 就以它为准,否则把桶内各类别相加
export const getMetricsTotal = (metrics?: MetricsResponse) => {
  if (!metrics?.data || !metrics.dict) return 0;

  let total = 0;
  for (const bucket of metrics.data) {
    let bucketTotal = 0;
    for (const [dictIndex, count] of bucket.data) {
      const key = metrics.dict[dictIndex];
      if (key === '_total') {
        bucketTotal = count;
        break;
      }
      bucketTotal += count;
    }
    total += bucketTotal;
  }

  return total;
};

// 字典项用 \u001f 分隔前缀与取值;取值为空时显示 unknown,别留一个光秃秃的前缀
export const buildChartPoints = (metrics?: MetricsResponse) => {
  if (!metrics?.data || !metrics?.dict) return [];

  const points: ChartDataPoint[] = [];
  for (const bucket of metrics.data) {
    for (const [dictIndex, count] of bucket.data) {
      const rawCategory = metrics.dict[dictIndex] || '';
      if (rawCategory === '_total') {
        continue;
      }

      let category = rawCategory.replace('\u001f', ': ');
      if (rawCategory.endsWith('\u001f')) {
        category = rawCategory.replace('\u001f', ': unknown');
      }

      points.push({
        time: bucket.time,
        value: count,
        category,
      });
    }
  }

  return points;
};

export const formatTooltipItem = (point: ChartDataPoint) => {
  const countLabel = point.value.toLocaleString();
  if (
    point.category === TOTAL_SERIES_LABEL ||
    point.sharePercent === undefined
  ) {
    return countLabel;
  }
  return `${countLabel} (${point.sharePercent.toFixed(1)}%)`;
};

export const parseMode = (value: string | null): MetricMode =>
  value === 'uv' ? 'uv' : 'pv';

export const parseKeyPrefix = (value: string | null): MetricKeyPrefix =>
  metricKeyOptions.some((option) => option.value === value)
    ? (value as MetricKeyPrefix)
    : 'rn';

export const createDefaultDateRange = (): [Dayjs, Dayjs] => {
  const end = dayjs();
  return [end.subtract(DEFAULT_RANGE_HOURS, 'hour'), end];
};

// 起止倒置说明 URL 被手改过,退回"结束时间往前 24 小时"而不是照单全收
export const parseDateRange = (
  searchParams: URLSearchParams,
  fallbackRange: [Dayjs, Dayjs],
): [Dayjs, Dayjs] => {
  const [fallbackStart, fallbackEnd] = fallbackRange;
  const parsedStart = searchParams.get('start')
    ? dayjs(searchParams.get('start'))
    : fallbackStart;
  const parsedEnd = searchParams.get('end')
    ? dayjs(searchParams.get('end'))
    : fallbackEnd;

  const start = parsedStart.isValid() ? parsedStart : fallbackStart;
  const end = parsedEnd.isValid() ? parsedEnd : fallbackEnd;
  if (start.isAfter(end)) {
    return [end.subtract(DEFAULT_RANGE_HOURS, 'hour'), end];
  }
  return [start, end];
};
