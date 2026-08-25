import dayjs from 'dayjs';

/** 指标页的分类数据点：同一时间桶下按类别拆分的计数。 */
export interface CategoryPoint {
  time: string;
  value: number;
  category: string;
  sharePercent?: number;
}

const DEFAULT_TOP_N = 10;

const neverTotal = () => false;

/** 按时间桶汇总各类别的计数。 */
export function sumByTime<P extends CategoryPoint>(
  points: readonly P[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const point of points) {
    totals.set(point.time, (totals.get(point.time) || 0) + point.value);
  }
  return totals;
}

/**
 * 给每个非总量点补上它在所在时间桶内的占比。分母优先用服务端下发的
 * 总量点（去重后的真实请求数），没有才退回该桶内各类别求和；分母为 0
 * 的点保持原样（不带 sharePercent）。总量点本身原样返回。
 */
export function attachSharePercent<P extends CategoryPoint>(
  points: readonly P[],
  isTotal: (point: P) => boolean = neverTotal,
): P[] {
  const timeTotals = new Map<
    string,
    { total: number; fallback: number; hasTotal: boolean }
  >();

  for (const point of points) {
    let entry = timeTotals.get(point.time);
    if (!entry) {
      entry = { total: 0, fallback: 0, hasTotal: false };
      timeTotals.set(point.time, entry);
    }
    if (isTotal(point)) {
      entry.total += point.value;
      entry.hasTotal = true;
    } else {
      entry.fallback += point.value;
    }
  }

  return points.map((point) => {
    if (isTotal(point)) {
      return point;
    }
    const entry = timeTotals.get(point.time);
    const denominator = entry
      ? entry.hasTotal
        ? entry.total
        : entry.fallback
      : 0;
    if (denominator <= 0) {
      return point;
    }
    return {
      ...point,
      sharePercent: (point.value / denominator) * 100,
    };
  });
}

/** 把各类别按时间桶求和成一条总量序列，按时间升序。 */
export function buildTotalSeries<P extends CategoryPoint>(
  points: readonly P[],
  label: string,
): CategoryPoint[] {
  if (!points.length) return [];
  return Array.from(sumByTime(points).entries())
    .map(([time, value]) => ({ time, value, category: label }))
    .sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
}

export interface SeriesAggregate {
  /** 各类别（不含总量点）在整个时间窗内的累计值。 */
  categoryTotals: Map<string, number>;
  /** 类别按累计值降序。 */
  sortedCategories: string[];
  /** 前 topN 个类别及其累计值。 */
  topCategories: Array<readonly [string, number]>;
  /** 数据里是否带服务端总量点。 */
  hasTotal: boolean;
  /** 时间窗内的总请求数：有总量点取总量点之和，否则取各类别之和。 */
  total: number;
}

/** 分类序列的窗口级汇总：类别排名、Top N、总量。 */
export function aggregateSeries<P extends CategoryPoint>(
  points: readonly P[],
  {
    isTotal = neverTotal,
    topN = DEFAULT_TOP_N,
  }: { isTotal?: (point: P) => boolean; topN?: number } = {},
): SeriesAggregate {
  const categoryTotals = new Map<string, number>();
  let hasTotal = false;
  let totalSum = 0;
  let nonTotalSum = 0;
  for (const point of points) {
    if (isTotal(point)) {
      hasTotal = true;
      totalSum += point.value;
      continue;
    }
    nonTotalSum += point.value;
    categoryTotals.set(
      point.category,
      (categoryTotals.get(point.category) || 0) + point.value,
    );
  }

  const sortedCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
  const topCategories = sortedCategories
    .slice(0, topN)
    .map((category) => [category, categoryTotals.get(category) || 0] as const);

  return {
    categoryTotals,
    sortedCategories,
    topCategories,
    hasTotal,
    total: hasTotal ? totalSum : nonTotalSum,
  };
}

/**
 * 折线图的默认图例与颜色域。图例默认只勾选 Top N 类别（否则几十条线糊成
 * 一团），pinned 里的类别即使排在 Top N 之外也强制勾选——入口链接点进来
 * 要看的那条线通常量很小；颜色域按排名排列，总量（若有）永远排第一。
 */
export function buildLegendDefaults(
  sortedCategories: readonly string[],
  {
    totalLabel,
    pinned = [],
    topN = DEFAULT_TOP_N,
  }: { totalLabel?: string; pinned?: readonly string[]; topN?: number } = {},
): { defaultLegendValues: string[]; colorDomain: string[] } {
  const topCategories = sortedCategories.slice(0, topN);
  const extras = pinned.filter(
    (label) =>
      sortedCategories.includes(label) && !topCategories.includes(label),
  );
  const selection = [...topCategories, ...extras];
  return {
    defaultLegendValues: totalLabel ? [totalLabel, ...selection] : selection,
    colorDomain: totalLabel
      ? [totalLabel, ...sortedCategories]
      : [...sortedCategories],
  };
}
