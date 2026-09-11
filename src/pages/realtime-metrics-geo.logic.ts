// 实时数据页的地区分布：服务端按北京时间自然日累加每个应用的
// 完成请求地区（app_geo:<day>:<appKey>），今日那一条边跑边涨。
// 这里只做窗口内求和与排名，不碰时间序列。

export interface AppGeoDay {
  date: string;
  requests: number;
  regions: Record<string, number>;
}

export interface AppGeoResponse {
  days: AppGeoDay[];
  retentionDays: number;
  regionResolver: boolean;
}

export type GeoWindow = 'today' | '7d' | '30d';

export const GEO_WINDOWS: GeoWindow[] = ['today', '7d', '30d'];

export const GEO_WINDOW_DAYS: Record<GeoWindow, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
};

// 一次拉满 30 天，切换窗口只在前端重新求和。
export const GEO_FETCH_DAYS = 30;
export const GEO_TOP_LIMIT = 12;

// 服务端解析不到地区时写入的字面量（normalizeCountry），界面上单独翻译。
export const UNKNOWN_REGION = '未知';

export interface GeoRegionShare {
  region: string;
  count: number;
  percent: number;
}

export interface GeoSummary {
  total: number;
  unknown: number;
  regionCount: number;
  top: GeoRegionShare[];
  // Top N 之外的合计；没有则为 null。
  rest: { regions: number; count: number; percent: number } | null;
}

export const parseGeoWindow = (value: string | null): GeoWindow =>
  GEO_WINDOWS.includes(value as GeoWindow) ? (value as GeoWindow) : 'today';

/**
 * days 由服务端按最新在前返回；窗口取前 N 天求和。未知地区参与总量和排名
 * （它往往就是最大的一项，藏起来会让占比失真），但单独给出计数。
 * labelOf 把服务端标签换成展示名（见 utils/region）；按展示名汇总，同一
 * 国家的代码写法和老数据的中文写法才会合成一行。未知标签不经过它。
 */
export const summarizeGeo = (
  days: readonly AppGeoDay[] | undefined,
  window: GeoWindow,
  limit = GEO_TOP_LIMIT,
  labelOf: (region: string) => string = (region) => region,
): GeoSummary => {
  const totals = new Map<string, number>();
  for (const day of (days ?? []).slice(0, GEO_WINDOW_DAYS[window])) {
    for (const [rawRegion, count] of Object.entries(day.regions ?? {})) {
      if (!Number.isFinite(count) || count <= 0) continue;
      const trimmed = rawRegion.trim();
      const region =
        !trimmed || trimmed === UNKNOWN_REGION
          ? UNKNOWN_REGION
          : labelOf(trimmed) || UNKNOWN_REGION;
      totals.set(region, (totals.get(region) ?? 0) + count);
    }
  }
  const total = Array.from(totals.values()).reduce((sum, n) => sum + n, 0);
  const ranked = Array.from(totals.entries())
    .sort(([leftRegion, leftCount], [rightRegion, rightCount]) =>
      rightCount === leftCount
        ? leftRegion.localeCompare(rightRegion)
        : rightCount - leftCount,
    )
    .map(([region, count]) => ({
      region,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }));
  const top = ranked.slice(0, limit);
  const tail = ranked.slice(limit);
  const restCount = tail.reduce((sum, item) => sum + item.count, 0);
  return {
    total,
    unknown: totals.get(UNKNOWN_REGION) ?? 0,
    regionCount: ranked.length,
    top,
    rest:
      tail.length > 0
        ? {
            regions: tail.length,
            count: restCount,
            percent: total > 0 ? (restCount / total) * 100 : 0,
          }
        : null,
  };
};
