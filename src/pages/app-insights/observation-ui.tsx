import { Alert, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { computeFunnelRates, MIN_EVENT_SAMPLES } from './logic';
import { formatInteger, formatPercent } from './shared';
import type { FunnelEventCounts, ObservationWindow } from './types';

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
      {stale && (
        <Alert type="warning" message={t('app_insights.stale_data')} />
      )}
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
  events,
}: {
  events: FunnelEventCounts;
}) => {
  const { t } = useTranslation();
  const rates = computeFunnelRates(events);
  const label =
    rates.health === null
      ? t('app_insights.insufficient_samples', {
          count: rates.rollbackSamples,
          minimum: MIN_EVENT_SAMPLES,
        })
      : t(
          rates.health === 'critical'
            ? 'app_insights.rollback_high'
            : rates.health === 'warning'
              ? 'app_insights.rollback_warning'
              : 'app_insights.rollback_low',
        );
  return (
    <Tooltip title={t('app_insights.rollback_only')}>
      <span className="inline-flex flex-col items-start gap-1">
        <Tag
          color={
            rates.health === 'critical'
              ? 'red'
              : rates.health === 'warning'
                ? 'orange'
                : undefined
          }
          className="m-0"
        >
          {label}
        </Tag>
        <ReportShare part={events.rollback} total={rates.rollbackSamples} />
      </span>
    </Tooltip>
  );
};
