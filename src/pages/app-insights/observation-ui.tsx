import { Alert, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { FUNNEL_HEALTH_LABEL_KEY } from '@/constants/i18n-keys';
import { MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';
import { cn } from '@/utils/helper';
import type { BreakdownSummary, FunnelHealth } from './logic';
import { formatInteger, formatPercent } from './shared';
import type { ObservationWindow } from './types';

export const ObservationNotice = ({
  window,
  source,
  updatedAt,
  stale = false,
  compact = false,
}: {
  window?: ObservationWindow | null;
  source: 'utc' | 'business';
  updatedAt: number;
  stale?: boolean;
  /** 卡片内用：窗口与刷新时间并成一行，尽力采集说明收进提示。 */
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const windowText = window
    ? t('app_insights.window_exact', {
        timezone: window.timezone,
        start: window.startInclusive,
        end: window.endExclusive,
      })
    : t(`app_insights.window_${source}_legacy`);
  const refreshedText =
    updatedAt > 0
      ? t('app_insights.last_refreshed', {
          time: new Date(updatedAt).toLocaleString(),
        })
      : t('app_insights.not_loaded');
  if (compact) {
    return (
      <div className="mb-2 text-xs text-gray-400" data-testid="metric-scope">
        {stale && (
          <Alert
            type="warning"
            className="mb-2"
            message={t('app_insights.stale_data')}
          />
        )}
        <Tooltip title={t('app_insights.best_effort')}>
          <span className="cursor-help">
            {windowText} · {refreshedText}
          </span>
        </Tooltip>
      </div>
    );
  }
  return (
    <div className="space-y-1 text-xs text-gray-500" data-testid="metric-scope">
      {stale && <Alert type="warning" message={t('app_insights.stale_data')} />}
      <div>{windowText}</div>
      <div>{refreshedText}</div>
      <div>{t('app_insights.best_effort')}</div>
    </div>
  );
};

export const observedInteger = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `≈ ${formatInteger(value)}`
    : '-';

export const ReportShare = ({
  part,
  total,
}: {
  part: number;
  total: number;
}) => (
  <span className="tabular-nums">
    {total > 0 ? formatPercent(part / total) : '-'}
    <span className="ml-1 text-xs text-gray-500">
      ({formatInteger(part)}/{formatInteger(total)})
    </span>
  </span>
);

export const RollbackObservation = ({
  health,
  samples,
  count,
}: {
  health: FunnelHealth;
  samples: number;
  count: number;
}) => {
  const { t } = useTranslation();
  const label =
    health === null
      ? t('app_insights.insufficient_samples', {
          count: samples,
          minimum: MIN_EVENT_SAMPLES,
        })
      : t(FUNNEL_HEALTH_LABEL_KEY[health]);
  return (
    <Tooltip title={t('app_insights.rollback_only')}>
      <span className="inline-flex flex-col items-start gap-1">
        <Tag
          color={
            health === 'critical'
              ? 'red'
              : health === 'warning'
                ? 'orange'
                : undefined
          }
          className="m-0"
        >
          {label}
        </Tag>
        <ReportShare part={count} total={samples} />
      </span>
    </Tooltip>
  );
};

const HEALTH_DOT: Record<NonNullable<FunnelHealth>, string> = {
  healthy: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

/** 表格单元格用的紧凑回滚占比：状态点 + 百分比 + 分子/分母，文字说明放进提示。 */
export const RollbackShare = ({
  health,
  samples,
  count,
}: {
  health: FunnelHealth;
  samples: number;
  count: number;
}) => {
  const { t } = useTranslation();
  const label =
    health === null
      ? t('app_insights.insufficient_samples', {
          count: samples,
          minimum: MIN_EVENT_SAMPLES,
        })
      : t(FUNNEL_HEALTH_LABEL_KEY[health]);
  return (
    <Tooltip title={label}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums',
          health === null
            ? 'text-gray-400'
            : health === 'critical'
              ? 'font-semibold text-red-500'
              : health === 'warning'
                ? 'font-semibold text-amber-600'
                : undefined,
        )}
      >
        <span
          className={cn(
            'inline-block h-2 w-2 shrink-0 rounded-full',
            health === null
              ? 'border border-gray-300 border-solid'
              : HEALTH_DOT[health],
          )}
        />
        {samples > 0 ? formatPercent(count / samples) : '-'}
        <span className="text-xs font-normal text-gray-400">
          {formatInteger(count)}/{formatInteger(samples)}
        </span>
        {health === null && (
          <span className="text-xs">{t('app_insights.samples_short')}</span>
        )}
      </span>
    </Tooltip>
  );
};

export const BreakdownAvailability = ({
  summary,
}: {
  summary: Pick<
    BreakdownSummary,
    'totalDays' | 'availableDays' | 'unavailableDays' | 'legacyDays'
  >;
}) => {
  const { t } = useTranslation();
  if (summary.totalDays === 0) return null;
  return (
    <div className="space-y-1 text-xs text-gray-500" role="status">
      {summary.availableDays === 0 && (
        <Alert type="warning" title={t('app_insights.breakdown_unavailable')} />
      )}
      <div>
        {t('app_insights.breakdown_availability', {
          available: summary.availableDays,
          total: summary.totalDays,
          unavailable: summary.unavailableDays,
        })}
      </div>
      {summary.legacyDays > 0 && (
        <div>
          {t('app_insights.breakdown_legacy_days', {
            days: summary.legacyDays,
          })}
        </div>
      )}
    </div>
  );
};
