import { Alert, Card, Radio, Spin, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AsyncColumn } from '@/components/lazy-chart';
import { useThemeMode } from '@/utils/theme-mode';
import {
  buildFunnelRows,
  type InsightView,
  type RefusedPackageSummary,
  rankFunnelRows,
  summarizeTraffic,
  trafficWarnings,
} from './logic';
import {
  ObservationNotice,
  observedInteger,
  RollbackObservation,
} from './observation-ui';
import {
  BarList,
  EmptyState,
  Footnote,
  formatInteger,
  InsightsError,
  Question,
  StatTile,
  useAppTraffic,
  useAppVersionFunnel,
  useHitOutcomeLabel,
  VersionLabel,
} from './shared';
import { HIT_OUTCOMES } from './types';

const RefusedPackages = ({
  items,
  total,
}: {
  items: readonly RefusedPackageSummary[];
  total: number;
}) => {
  const { t } = useTranslation();
  const unattributed =
    total - items.reduce((sum, row) => sum + row.requests, 0);
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {items.slice(0, 10).map((row) => (
        <Tag key={row.packageVersion} className="m-0">
          {row.packageVersion}: {formatInteger(row.requests)}
        </Tag>
      ))}
      {items.length > 10 && (
        <span>
          {t('app_insights.refused_packages_more', {
            count: items.length - 10,
          })}
        </span>
      )}
      {unattributed > 0 && (
        <span>
          {t('app_insights.refused_packages_unattributed', {
            count: unattributed,
          })}
        </span>
      )}
    </div>
  );
};

export const OverviewPanel = ({
  appKey,
  days,
  onNavigate,
}: {
  appKey: string | undefined;
  days: number;
  onNavigate: (view: InsightView) => void;
}) => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const hitLabel = useHitOutcomeLabel();
  const [dailyMetric, setDailyMetric] = useState<'requests' | 'dau'>(
    'requests',
  );
  const traffic = useAppTraffic(appKey, days);
  const funnel = useAppVersionFunnel(appKey, days);
  const summary = useMemo(
    () => summarizeTraffic(traffic.data?.days, traffic.data?.window?.today),
    [traffic.data],
  );
  const rows = useMemo(
    () => rankFunnelRows(buildFunnelRows(funnel.data)).slice(0, 5),
    [funnel.data],
  );
  const warnings = trafficWarnings(summary.hit);
  const hasRequests = summary.daily.some((day) => day.requests !== null);
  const activeOutcomes = HIT_OUTCOMES.filter((key) => summary.hit[key] > 0);
  const dailyData = summary.daily.flatMap((day) =>
    dailyMetric === 'dau'
      ? [{ date: day.date, category: t('app_insights.dau'), value: day.dau }]
      : activeOutcomes.map((key) => ({
          date: day.date,
          category: hitLabel(key),
          value: day.requests === null ? null : day.hit[key],
        })),
  );
  const outcomes = activeOutcomes
    .map((key) => ({
      key,
      label: hitLabel(key),
      count: summary.hit[key],
      percent:
        summary.requests > 0 ? (summary.hit[key] / summary.requests) * 100 : 0,
      alert: key === 'blocked' || key === 'unknown_package',
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-4">
      {!!traffic.error && <InsightsError error={traffic.error} />}
      <ObservationNotice
        window={traffic.data?.window}
        source="business"
        updatedAt={traffic.dataUpdatedAt}
        stale={!!traffic.error && !!traffic.data}
      />
      <Spin spinning={traffic.isLoading}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile
            label={t('app_insights.today_requests')}
            value={formatInteger(summary.today?.requests)}
            live
          />
          <StatTile
            label={t('app_insights.today_dau')}
            value={observedInteger(summary.today?.dau)}
            hint={t('app_insights.dau_hint')}
            live
          />
          <StatTile
            label={t('app_insights.window_requests', { days })}
            value={formatInteger(hasRequests ? summary.requests : null)}
            hint={t('app_insights.daily_average', {
              value: formatInteger(summary.averageDailyRequests),
              samples: summary.requestSampleDays,
              days: summary.completedDays,
            })}
          />
          <StatTile
            label={t('app_insights.peak_dau', { days })}
            value={observedInteger(summary.peakDau)}
            hint={t('app_insights.dau_average', {
              value: formatInteger(summary.averageDau),
              samples: summary.dauSampleDays,
              days: summary.completedDays,
            })}
          />
        </div>
      </Spin>
      <Footnote>{t('app_insights.means_note')}</Footnote>
      {warnings.map((outcome) => (
        <Alert
          key={outcome}
          type="warning"
          showIcon
          message={`${hitLabel(outcome)}: ${formatInteger(summary.hit[outcome])}`}
          description={
            <>
              {t(
                outcome === 'blocked'
                  ? 'app_insights.refusal_blocked'
                  : 'app_insights.refusal_unknown_package',
              )}
              <RefusedPackages
                items={summary.refused[outcome]}
                total={summary.hit[outcome]}
              />
            </>
          }
        />
      ))}
      <Card
        size="small"
        title={t('app_insights.daily_title')}
        extra={
          <Radio.Group
            value={dailyMetric}
            onChange={(event) => setDailyMetric(event.target.value)}
            size="small"
          >
            <Radio.Button value="requests">
              {t('app_insights.daily_requests')}
            </Radio.Button>
            <Radio.Button value="dau">{t('app_insights.dau')}</Radio.Button>
          </Radio.Group>
        }
      >
        <Spin spinning={traffic.isLoading}>
          {dailyData.length > 0 ? (
            <AsyncColumn
              theme={isDark ? 'classicDark' : 'classic'}
              data={dailyData}
              xField="date"
              yField="value"
              colorField="category"
              stack={dailyMetric === 'requests'}
              height={300}
              axis={{ x: { title: false }, y: { title: false } }}
              legend={{ color: { position: 'top' } }}
            />
          ) : (
            <EmptyState>
              {traffic.isLoading ? '' : t('app_insights.no_observations')}
            </EmptyState>
          )}
        </Spin>
        <Footnote>{t('app_insights.daily_footnote')}</Footnote>
      </Card>
      <Card size="small" title={t('app_insights.outcome_title')}>
        <Question>{t('app_insights.outcome_question')}</Question>
        {outcomes.length > 0 ? (
          <BarList items={outcomes} />
        ) : (
          <EmptyState>{t('app_insights.no_observations')}</EmptyState>
        )}
        <Footnote>{t('app_insights.outcome_footnote')}</Footnote>
      </Card>
      <Card
        size="small"
        title={t('app_insights.versions_glance_title')}
        extra={
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent text-primary"
            onClick={() => onNavigate('versions')}
          >
            {t('app_insights.view_all_versions')}
          </button>
        }
      >
        <Question>{t('app_insights.versions_glance_question')}</Question>
        {!!funnel.error && <InsightsError error={funnel.error} />}
        <ObservationNotice
          window={funnel.data?.window}
          source="utc"
          updatedAt={funnel.dataUpdatedAt}
          stale={!!funnel.error && !!funnel.data}
        />
        <Spin spinning={funnel.isLoading}>
          {rows.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {rows.map((row) => (
                <div
                  key={row.hash}
                  className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <VersionLabel hash={row.hash} name={row.name} />
                    <div className="mt-1 text-xs text-gray-500">
                      {t('app_insights.glance_line', {
                        served: formatInteger(row.servedTotal),
                        activated: formatInteger(row.events.markSuccess),
                        failed: formatInteger(row.failures),
                        rollback: formatInteger(row.events.rollback),
                      })}
                    </div>
                    <div className="mt-2">
                      <RollbackObservation
                        health={row.health}
                        samples={row.rollbackSamples}
                        count={row.events.rollback}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {observedInteger(row.retained?.mark)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('app_insights.observed_glance')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              {funnel.isLoading ? '' : t('app_insights.no_observations')}
            </EmptyState>
          )}
        </Spin>
        <Footnote>{t('app_insights.events_not_funnel')}</Footnote>
        <Footnote>
          {t('app_insights.retained_scope')} {t('app_insights.retained_hint')}
        </Footnote>
      </Card>
    </div>
  );
};
