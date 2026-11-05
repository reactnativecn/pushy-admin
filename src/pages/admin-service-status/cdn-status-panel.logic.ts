import type { CdnWindowName } from '@/services/admin-api';

const DAY_SECONDS = 86_400;
const HOUR_SECONDS = 3600;

const SHORT_REFRESH_MS = 60_000;
const LONG_REFRESH_MS = 10 * 60_000;

/**
 * Tab 对应的时段。长时段变化慢、覆盖的数据多，刷新得也慢；seconds 为空的时段
 * 长度不固定（今日从零点算起），不提示数据覆盖不足。
 */
type CdnWindowConfig = {
  key: CdnWindowName;
  labelKey: string;
  seconds?: number;
  refreshMs: number;
};

const LAST_HOUR_WINDOW: CdnWindowConfig = {
  key: 'last1h',
  labelKey: 'cdn_status.window_1h',
  seconds: HOUR_SECONDS,
  refreshMs: SHORT_REFRESH_MS,
};

export const CDN_WINDOWS: CdnWindowConfig[] = [
  LAST_HOUR_WINDOW,
  {
    key: 'today',
    labelKey: 'cdn_status.window_today',
    refreshMs: SHORT_REFRESH_MS,
  },
  {
    key: 'yesterday',
    labelKey: 'cdn_status.window_yesterday',
    seconds: DAY_SECONDS,
    refreshMs: LONG_REFRESH_MS,
  },
  {
    key: 'last7d',
    labelKey: 'cdn_status.window_7d',
    seconds: 7 * DAY_SECONDS,
    refreshMs: LONG_REFRESH_MS,
  },
  {
    key: 'last30d',
    labelKey: 'cdn_status.window_30d',
    seconds: 30 * DAY_SECONDS,
    refreshMs: LONG_REFRESH_MS,
  },
  {
    key: 'last90d',
    labelKey: 'cdn_status.window_90d',
    seconds: 90 * DAY_SECONDS,
    refreshMs: LONG_REFRESH_MS,
  },
];

export function cdnWindowConfig(key: CdnWindowName) {
  return CDN_WINDOWS.find((window) => window.key === key) ?? LAST_HOUR_WINDOW;
}

/**
 * 节点历史不足一个时段时，返回实际覆盖的时长，提示平均值和总量只算了这么久。
 * 差一个采集周期以内不算不足。
 */
export function coverageShortfall(
  coveredSeconds: number,
  windowSeconds: number | undefined,
) {
  if (windowSeconds == null || coveredSeconds >= windowSeconds - 120) {
    return null;
  }
  return coveredSeconds >= 2 * DAY_SECONDS
    ? { unit: 'days' as const, value: Math.floor(coveredSeconds / DAY_SECONDS) }
    : {
        unit: 'hours' as const,
        value: Number((coveredSeconds / HOUR_SECONDS).toFixed(1)),
      };
}

/** 窗口内发送的平均带宽；节点历史不足一个窗口时按实际覆盖的时长计算。 */
export function averageMbps(bytes: number, coveredSeconds: number) {
  if (!(coveredSeconds > 0) || !Number.isFinite(bytes)) {
    return null;
  }
  return (bytes * 8) / coveredSeconds / 1_000_000;
}

export function formatMbps(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return '-';
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} Mbps`;
}

/** 分母为 0 时没有意义，返回 null，展示为「-」。 */
export function safeRatio(part: number, total: number) {
  return total > 0 ? part / total : null;
}

export function averageGetMs(sumMs: number, getRequests: number) {
  return getRequests > 0 ? sumMs / getRequests : null;
}

/** certNotAfter 为 0 表示节点读不到证书。向下取整，临近过期时宁可少报。 */
export function certDaysLeft(notAfter: number, nowMs: number) {
  if (!(notAfter > 0)) {
    return null;
  }
  return Math.floor((notAfter - nowMs / 1000) / DAY_SECONDS);
}
