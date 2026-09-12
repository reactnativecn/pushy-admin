import { useQuery } from '@tanstack/react-query';
import { Alert, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { RequestError } from '@/services/request';
import { cn } from '@/utils/helper';
import { metricsKeys } from '@/utils/query-keys';
import { isKnownCarrier, parseFailureReason, shortHash } from './logic';
import type { HitOutcome } from './types';

const { Text } = Typography;

/** 分析存储不可用时服务端返回 503；重试没有意义，其它错误按默认策略重试。 */
const retryUnlessUnavailable = (failureCount: number, error: unknown) =>
  !(error instanceof RequestError && error.status === 503) && failureCount < 2;

// 今日那一条服务端边跑边涨，页面停留时每分钟跟上一次即可。
const LIVE_REFETCH_MS = 60_000;

export const useAppTraffic = (appKey: string | undefined, days: number) =>
  useQuery({
    queryKey: metricsKeys.appTraffic(appKey, days),
    queryFn: () => api.getAppTraffic({ appKey: appKey!, days }),
    enabled: !!appKey,
    retry: retryUnlessUnavailable,
    refetchInterval: LIVE_REFETCH_MS,
  });

export const useAppEventBreakdown = (
  appKey: string | undefined,
  days: number,
) =>
  useQuery({
    queryKey: metricsKeys.appEventBreakdown(appKey, days),
    queryFn: () => api.getAppEventBreakdown({ appKey: appKey!, days }),
    enabled: !!appKey,
    retry: retryUnlessUnavailable,
    refetchInterval: LIVE_REFETCH_MS,
  });

export const useAppVersionFunnel = (appKey: string | undefined, days: number) =>
  useQuery({
    queryKey: metricsKeys.appVersionFunnel(appKey, days),
    queryFn: () => api.getAppVersionFunnel({ appKey: appKey!, days }),
    enabled: !!appKey,
    retry: retryUnlessUnavailable,
    refetchInterval: LIVE_REFETCH_MS,
  });

/** 接口失败的就地提示：503 带服务端的 analyticsUnavailableMessage。 */
export const InsightsError = ({ error }: { error: unknown }) => {
  const { t } = useTranslation();
  const detail =
    error instanceof Error && error.message ? error.message : undefined;
  const unavailable = error instanceof RequestError && error.status === 503;
  return (
    <Alert
      type={unavailable ? 'warning' : 'error'}
      showIcon
      className="mb-3"
      message={t(
        unavailable ? 'app_insights.unavailable' : 'app_insights.load_failed',
      )}
      description={detail}
    />
  );
};

export const formatInteger = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.round(value as number).toLocaleString() : '-';

export const formatPercent = (ratio: number | null | undefined, digits = 1) =>
  Number.isFinite(ratio)
    ? `${((ratio as number) * 100).toFixed(digits)}%`
    : '-';

export const formatShare = (percent: number) => `${percent.toFixed(1)}%`;

/** 单个指标块：标题 → 大数字 → 一句补充说明。 */
export const StatTile = ({
  label,
  value,
  hint,
  tone,
  live,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'warning' | 'error';
  live?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'rounded border px-3 py-2',
        tone === 'error'
          ? 'border-red-200 bg-red-50'
          : tone === 'warning'
            ? 'border-amber-200 bg-amber-50'
            : 'border-gray-100 bg-gray-50',
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{label}</span>
        {live && (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-1.5 text-[10px] text-green-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            {t('app_insights.live')}
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold leading-none tabular-nums text-gray-900">
        {value}
      </div>
      {hint !== undefined && (
        <div className="mt-1 truncate text-[11px] text-gray-500">{hint}</div>
      )}
    </div>
  );
};

/** 图表卡片下方的一句"它回答什么问题"，与口径脚注分开。 */
export const Question = ({ children }: { children: ReactNode }) => (
  <div className="mb-3 text-sm text-gray-500">{children}</div>
);

export const Footnote = ({ children }: { children: ReactNode }) => (
  <div className="mt-3 text-xs text-gray-400">{children}</div>
);

export const EmptyState = ({
  children,
  height = 'h-24',
}: {
  children: ReactNode;
  height?: string;
}) => (
  <div
    className={cn(
      'flex items-center justify-center text-sm text-gray-400',
      height,
    )}
  >
    {children}
  </div>
);

export interface BarListItem {
  key: string;
  label: ReactNode;
  count: number;
  percent: number;
  /** 灰色条：未知、其它之类的兜底项 */
  muted?: boolean;
  /** 红色条：拒绝、失败之类需要注意的项 */
  alert?: boolean;
  title?: string;
}

/** 排名条形列表：地区分布面板的同款布局，供各种"名称→次数"用。 */
export const BarList = ({
  items,
  limit = 10,
  restLabel,
}: {
  items: BarListItem[];
  limit?: number;
  restLabel?: (count: number) => ReactNode;
}) => {
  const top = items.slice(0, limit);
  const rest = items.slice(limit);
  const restCount = rest.reduce((sum, item) => sum + item.count, 0);
  const restPercent = rest.reduce((sum, item) => sum + item.percent, 0);
  const max = top[0]?.count ?? 0;
  return (
    <ul className="m-0 list-none p-0">
      {top.map((item, index) => (
        <li
          key={item.key}
          className="grid grid-cols-[1.5rem_minmax(0,11rem)_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-2 py-1 text-sm"
        >
          <span className="text-xs text-gray-400 tabular-nums">
            {index + 1}
          </span>
          <span className="truncate" title={item.title}>
            {item.label}
          </span>
          <span className="h-2 overflow-hidden rounded bg-gray-100">
            <span
              className={cn(
                'block h-full rounded',
                item.alert
                  ? 'bg-red-500'
                  : item.muted
                    ? 'bg-gray-300'
                    : 'bg-primary',
              )}
              style={{
                width: `${max > 0 ? Math.max((item.count / max) * 100, 2) : 0}%`,
              }}
            />
          </span>
          <span className="text-right tabular-nums">
            {formatInteger(item.count)}
          </span>
          <span className="text-right text-xs text-gray-500 tabular-nums">
            {formatShare(item.percent)}
          </span>
        </li>
      ))}
      {rest.length > 0 && (
        <li className="grid grid-cols-[1.5rem_minmax(0,11rem)_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-2 py-1 text-sm text-gray-500">
          <span />
          <span className="truncate">
            {restLabel ? restLabel(rest.length) : `+${rest.length}`}
          </span>
          <span />
          <span className="text-right tabular-nums">
            {formatInteger(restCount)}
          </span>
          <span className="text-right text-xs tabular-nums">
            {formatShare(restPercent)}
          </span>
        </li>
      )}
    </ul>
  );
};

/** 热更版本：显示版本名（已删除时标灰），hash 缩写可复制完整值。 */
export const VersionLabel = ({
  hash,
  name,
  compact,
}: {
  hash: string;
  name: string | null | undefined;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex min-w-0 max-w-full items-baseline gap-1.5">
      {name ? (
        <span className="truncate font-medium" title={name}>
          {name}
        </span>
      ) : (
        <Tooltip title={t('app_insights.version_deleted_hint')}>
          <span className="truncate italic text-gray-400">
            {t('app_insights.version_deleted')}
          </span>
        </Tooltip>
      )}
      <Text
        className={cn(
          'font-mono text-gray-500',
          compact ? 'text-[11px]' : 'text-xs',
        )}
        copyable={{
          text: hash,
          tooltips: [t('app_insights.copy_hash'), false],
        }}
      >
        {shortHash(hash)}
      </Text>
    </span>
  );
};

export const useHitOutcomeLabel = () => {
  const { t } = useTranslation();
  const labels: Record<HitOutcome, string> = {
    uptodate: t('app_insights.hit_uptodate'),
    hdiff: t('app_insights.hit_hdiff'),
    pdiff: t('app_insights.hit_pdiff'),
    full: t('app_insights.hit_full'),
    paused: t('app_insights.hit_paused'),
    expired: t('app_insights.hit_expired'),
    blocked: t('app_insights.hit_blocked'),
    unknown_package: t('app_insights.hit_unknown_package'),
  };
  return (outcome: HitOutcome) => labels[outcome];
};

export const useCarrierLabel = () => {
  const { t } = useTranslation();
  return (carrier: string) => {
    if (!isKnownCarrier(carrier)) return carrier;
    const key = {
      电信: 'app_insights.carrier_telecom',
      联通: 'app_insights.carrier_unicom',
      移动: 'app_insights.carrier_mobile',
      广电: 'app_insights.carrier_broadcast',
      教育网: 'app_insights.carrier_cernet',
      云: 'app_insights.carrier_cloud',
      其他: 'app_insights.carrier_other',
      其他地区: 'app_insights.carrier_overseas',
      unknown: 'app_insights.carrier_unknown',
    }[carrier];
    return t(key);
  };
};

export const useFailureReasonLabel = () => {
  const { t } = useTranslation();
  return (reason: string) => {
    const parsed = parseFailureReason(reason);
    if (parsed.kind === 'other') {
      return parsed.detail
        ? t('app_insights.reason_other_detail', { detail: parsed.detail })
        : t('app_insights.reason_other');
    }
    const key = {
      empty: 'app_insights.reason_empty',
      crc_mismatch: 'app_insights.reason_crc_mismatch',
      patch_apply: 'app_insights.reason_patch_apply',
      no_space: 'app_insights.reason_no_space',
      timeout: 'app_insights.reason_timeout',
      network: 'app_insights.reason_network',
      http_4xx: 'app_insights.reason_http_4xx',
      http_5xx: 'app_insights.reason_http_5xx',
      file_io: 'app_insights.reason_file_io',
      zip: 'app_insights.reason_zip',
      bundle_mismatch: 'app_insights.reason_bundle_mismatch',
    }[parsed.reason];
    return t(key);
  };
};

export const useEventTypeLabel = () => {
  const { t } = useTranslation();
  const labels = {
    download_success: t('version_health.download_success'),
    download_fail: t('version_health.download_fail'),
    patch_fail: t('version_health.patch_fail'),
    rollback: t('version_health.rollback'),
    mark_success: t('version_health.mark_success'),
  } as const;
  return (type: keyof typeof labels) => labels[type];
};
