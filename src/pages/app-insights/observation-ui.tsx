import { Alert, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { FUNNEL_HEALTH_LABEL_KEY } from '@/constants/i18n-keys';
import { MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';
import type { BreakdownSummary, FunnelHealth } from './logic';
import { formatInteger, formatPercent } from './shared';
import type { ObservationWindow } from './types';

export const ObservationNotice = ({
  window,
  source,
  updatedAt,
  stale = false,
}: {
  window?: ObservationWindow | null;
  source: 'utc' | 'business';
  updatedAt: number;
  stale?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 text-xs text-gray-500" data-testid="metric-scope">
      {stale && <Alert type="warning" message={t('app_insights.stale_data')} />}
      <div>
        {window
          ? t('app_insights.window_exact', {
              timezone: window.timezone,
              start: window.startInclusive,
              end: window.endExclusive,
            })
          : t(`app_insights.window_${source}_legacy`)}
      </div>
      <div>
        {updatedAt > 0
          ? t('app_insights.last_refreshed', {
              time: new Date(updatedAt).toLocaleString(),
            })
          : t('app_insights.not_loaded')}
      </div>
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
