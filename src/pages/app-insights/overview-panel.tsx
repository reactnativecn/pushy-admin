import { Alert, Card, Radio, Spin, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AsyncColumn, AsyncLine } from '@/components/lazy-chart';
import { FUNNEL_HEALTH_LABEL_KEY } from '@/constants/i18n-keys';
import { buildTimeSeriesLineConfig } from '@/utils/charts';
import { useThemeMode } from '@/utils/theme-mode';
import {
  buildFunnelRows,
  type FunnelRow,
  type InsightView,
  summarizeTraffic,
  trafficWarnings,
} from './logic';
import { HIT_OUTCOME_COLORS } from './palette';
import {
  BarList,
  EmptyState,
  Footnote,
  formatInteger,
  formatPercent,
  formatShare,
  InsightsError,
  Question,
  StatTile,
  useAppTraffic,
  useAppVersionFunnel,
  useHitOutcomeLabel,
  VersionLabel,
} from './shared';
import { HIT_OUTCOMES, type HitOutcome } from './types';

type DailyMetric = 'requests' | 'dau';

const OVERVIEW_VERSION_LIMIT = 5;

const HEALTH_TAG_COLOR = {
  healthy: 'green',
  warning: 'orange',
  critical: 'red',
} as const;

export const HealthTag = ({ health }: { health: FunnelRow['health'] }) => {
  const { t } = useTranslation();
  if (!health) return null;
  return (
    <Tag color={HEALTH_TAG_COLOR[health]} className="m-0">
      {t(FUNNEL_HEALTH_LABEL_KEY[health])}
    </Tag>
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
  const [dailyMetric, setDailyMetric] = useState<DailyMetric>('requests');

  const traffic = useAppTraffic(appKey, days);
  const funnel = useAppVersionFunnel(appKey, days);

  const summary = useMemo(
    () => summarizeTraffic(traffic.data?.days),
    [traffic.data],
  );
  const warnings = trafficWarnings(summary.hit);
  const funnelRows = useMemo(
    () => buildFunnelRows(funnel.data).slice(0, OVERVIEW_VERSION_LIMIT),
    [funnel.data],
  );

  // 只保留窗口内出现过的结果类别，图例不会被一排 0 撑满；颜色仍按类别固定。
  const activeOutcomes = HIT_OUTCOMES.filter(
    (outcome) => summary.hit[outcome] > 0,
  );
  const stackedData = useMemo(
    () =>
      summary.daily.flatMap((day) =>
        activeOutcomes.map((outcome) => ({
          date: day.date,
          outcome,
          label: hitLabel(outcome),
          value: day.hit[outcome],
          isToday: day.isToday,
        })),
      ),
    [summary.daily, activeOutcomes, hitLabel],
  );
  const columnConfig = {
    theme: isDark ? 'classicDark' : 'classic',
    data: stackedData,
    xField: 'date',
    yField: 'value',
    colorField: 'label',
    stack: true,
    height: 320,
    axis: {
      x: { title: false, labelAutoRotate: true },
      y: { title: false },
    },
    legend: { color: { position: 'top' } },
    scale: {
      color: {
        domain: activeOutcomes.map(hitLabel),
        range: activeOutcomes.map((outcome) => HIT_OUTCOME_COLORS[outcome]),
      },
    },
    interaction: { tooltip: { shared: true } },
    tooltip: {
      title: (point: { date: string; isToday: boolean }) =>
        point.isToday
          ? `${point.date} · ${t('app_insights.today_live')}`
          : point.date,
      items: [
        (point: { label: string; value: number }) => ({
          name: point.label,
          value: formatInteger(point.value),
        }),
      ],
    },
  };

  const dauData = useMemo(
    () =>
      summary.daily.map((day) => ({
        time: day.date,
        value: day.dau,
        category: t('app_insights.dau'),
      })),
    [summary.daily, t],
  );
  const dauConfig = buildTimeSeriesLineConfig({
    data: dauData,
    isDark,
    height: 320,
    axisTimeFormat: 'MM/DD',
    tooltipTimeFormat: 'YYYY-MM-DD',
    formatTooltipValue: (point) => formatInteger(point.value),
  });

  const outcomeItems = HIT_OUTCOMES.filter(
    (outcome) => summary.hit[outcome] > 0,
  ).map((outcome: HitOutcome) => ({
    key: outcome,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-sm"
          style={{ background: HIT_OUTCOME_COLORS[outcome] }}
        />
        {hitLabel(outcome)}
      </span>
    ),
    count: summary.hit[outcome],
    percent:
      summary.requests > 0
        ? (summary.hit[outcome] / summary.requests) * 100
        : 0,
    muted: outcome === 'uptodate',
    alert: outcome === 'blocked' || outcome === 'unknown_package',
  }));

  const hasTraffic = summary.requests > 0;

  return (
    <div className="flex flex-col gap-4">
      {traffic.error ? <InsightsError error={traffic.error} /> : null}
      <Spin spinning={traffic.isLoading}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile
            label={t('app_insights.today_requests')}
            value={formatInteger(summary.today?.requests ?? 0)}
            hint={t('app_insights.today_live_hint')}
            live
          />
          <StatTile
            label={t('app_insights.today_dau')}
            value={formatInteger(summary.today?.dau ?? 0)}
            hint={t('app_insights.dau_hint')}
            live
          />
          <StatTile
            label={t('app_insights.window_requests', { days })}
            value={formatInteger(summary.requests)}
            hint={t('app_insights.daily_average', {
              value: formatInteger(summary.averageDailyRequests),
            })}
          />
          <StatTile
            label={t('app_insights.peak_dau', { days })}
            value={formatInteger(summary.peakDau)}
            hint={t('app_insights.dau_average', {
              value: formatInteger(summary.averageDau),
            })}
          />
        </div>
      </Spin>

      {warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={t('app_insights.refusal_title', {
            count: summary.hit.blocked + summary.hit.unknown_package,
            percent: formatShare(summary.refusedPercent),
          })}
          description={
            <ul className="m-0 list-disc pl-4">
              {warnings.includes('blocked') && (
                <li>
                  <Trans
                    i18nKey="app_insights.refusal_blocked"
                    values={{ count: formatInteger(summary.hit.blocked) }}
                    components={{ strong: <strong /> }}
                  />
                </li>
              )}
              {warnings.includes('unknown_package') && (
                <li>
                  <Trans
                    i18nKey="app_insights.refusal_unknown_package"
                    values={{
                      count: formatInteger(summary.hit.unknown_package),
                    }}
                    components={{ strong: <strong /> }}
                  />
                </li>
              )}
            </ul>
          }
        />
      )}

      <Card
        size="small"
        title={t('app_insights.daily_title')}
        extra={
          <Radio.Group
            size="small"
            value={dailyMetric}
            onChange={(event) =>
              setDailyMetric(event.target.value as DailyMetric)
            }
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="requests">
              {t('app_insights.daily_requests')}
            </Radio.Button>
            <Radio.Button value="dau">{t('app_insights.dau')}</Radio.Button>
          </Radio.Group>
        }
      >
        <Question>
          {dailyMetric === 'requests'
            ? t('app_insights.daily_requests_question')
            : t('app_insights.daily_dau_question')}
        </Question>
        <Spin spinning={traffic.isLoading}>
          {!hasTraffic ? (
            <EmptyState height="h-64">
              {traffic.isLoading ? '' : t('app_insights.no_traffic')}
            </EmptyState>
          ) : dailyMetric === 'requests' ? (
            <AsyncColumn {...columnConfig} />
          ) : (
            <AsyncLine {...dauConfig} />
          )}
        </Spin>
        <Footnote>
          {t('app_insights.daily_footnote', {
            retention: traffic.data?.retentionDays ?? 35,
          })}
        </Footnote>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="small" title={t('app_insights.outcome_title')}>
          <Question>{t('app_insights.outcome_question')}</Question>
          {outcomeItems.length > 0 ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <StatTile
                  label={t('app_insights.update_share')}
                  value={formatShare(summary.updatePercent)}
                  hint={t('app_insights.update_share_hint')}
                />
                <StatTile
                  label={t('app_insights.refused_share')}
                  value={formatShare(summary.refusedPercent)}
                  hint={t('app_insights.refused_share_hint')}
                  tone={summary.refusedPercent > 0 ? 'warning' : undefined}
                />
              </div>
              <BarList items={outcomeItems} />
            </>
          ) : (
            <EmptyState>
              {traffic.isLoading ? '' : t('app_insights.no_traffic')}
            </EmptyState>
          )}
          <Footnote>{t('app_insights.outcome_footnote')}</Footnote>
        </Card>

        <Card
          size="small"
          title={t('app_insights.versions_glance_title')}
          extra={
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-sm text-primary"
              onClick={() => onNavigate('versions')}
            >
              {t('app_insights.view_all_versions')}
            </button>
          }
        >
          <Question>{t('app_insights.versions_glance_question')}</Question>
          {funnel.error ? <InsightsError error={funnel.error} /> : null}
          <Spin spinning={funnel.isLoading}>
            {funnelRows.length > 0 ? (
              <ul className="m-0 list-none p-0">
                {funnelRows.map((row) => (
                  <li
                    key={row.hash}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <VersionLabel hash={row.hash} name={row.name} />
                      <div className="mt-0.5 text-xs text-gray-500">
                        {t('app_insights.glance_line', {
                          served: formatInteger(row.servedTotal),
                          activated: formatInteger(row.events.markSuccess),
                          activation: formatPercent(row.adoptionRate),
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {row.coverage === null
                          ? '-'
                          : formatPercent(row.coverage)}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {t('app_insights.coverage')}
                      </span>
                      <HealthTag health={row.health} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>
                {funnel.isLoading ? '' : t('app_insights.no_versions')}
              </EmptyState>
            )}
          </Spin>
          <Footnote>
            {t('app_insights.coverage_footnote', {
              dau: formatInteger(funnel.data?.dauToday ?? 0),
            })}
          </Footnote>
        </Card>
      </div>
    </div>
  );
};
