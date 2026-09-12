import { Card, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DimensionRow,
  FAILURE_EVENT_TYPES,
  type ReasonRow,
  summarizeBreakdown,
} from './logic';
import {
  EmptyState,
  Footnote,
  formatInteger,
  formatPercent,
  formatShare,
  InsightsError,
  Question,
  StatTile,
  useAppEventBreakdown,
  useCarrierLabel,
  useEventTypeLabel,
  useFailureReasonLabel,
  VersionLabel,
} from './shared';
import { CLIENT_EVENT_TYPES } from './types';

const ALL = '__all__';
const REASON_VERSION_LIMIT = 3;

const DimensionTable = ({
  rows,
  labelOf,
  keyTitle,
}: {
  rows: DimensionRow[];
  labelOf: (key: string) => string;
  keyTitle: string;
}) => {
  const { t } = useTranslation();
  const eventLabel = useEventTypeLabel();
  const columns: ColumnsType<DimensionRow> = [
    {
      title: keyTitle,
      key: 'key',
      render: (_, row) => labelOf(row.key),
    },
    ...CLIENT_EVENT_TYPES.map((type) => ({
      title: eventLabel(type),
      key: type,
      align: 'right' as const,
      render: (_: unknown, row: DimensionRow) =>
        row.counts[type] > 0 && FAILURE_EVENT_TYPES.has(type) ? (
          <span className="text-red-500">
            {formatInteger(row.counts[type])}
          </span>
        ) : (
          formatInteger(row.counts[type])
        ),
    })),
    {
      title: t('app_insights.col_failure_rate'),
      key: 'failureRate',
      align: 'right',
      render: (_, row) => formatPercent(row.failureRate),
    },
    {
      title: t('app_insights.col_rollback_rate'),
      key: 'rollbackRate',
      align: 'right',
      render: (_, row) => formatPercent(row.rollbackRate),
    },
  ];
  return (
    <Table
      size="small"
      rowKey="key"
      columns={columns}
      dataSource={rows}
      pagination={false}
      scroll={{ x: 'max-content' }}
    />
  );
};

export const FailuresPanel = ({
  appKey,
  days,
}: {
  appKey: string | undefined;
  days: number;
}) => {
  const { t } = useTranslation();
  const reasonLabel = useFailureReasonLabel();
  const carrierLabel = useCarrierLabel();
  const eventLabel = useEventTypeLabel();
  const breakdown = useAppEventBreakdown(appKey, days);
  const [versionFilter, setVersionFilter] = useState<string>(ALL);

  const all = useMemo(
    () => summarizeBreakdown(breakdown.data?.days),
    [breakdown.data],
  );
  const summary = useMemo(
    () =>
      versionFilter === ALL
        ? all
        : summarizeBreakdown(breakdown.data?.days, versionFilter),
    [all, breakdown.data, versionFilter],
  );

  const versionOptions = useMemo(
    () => [
      { value: ALL, label: t('app_insights.filter_all_versions') },
      ...Array.from(all.versionNames.entries()).map(([hash, name]) => ({
        value: hash,
        label: name
          ? `${name} (${hash.slice(0, 8)})`
          : `${t('app_insights.version_deleted')} (${hash.slice(0, 8)})`,
      })),
    ],
    [all.versionNames, t],
  );

  const reasonColumns: ColumnsType<ReasonRow> = [
    {
      title: t('app_insights.col_reason'),
      key: 'reason',
      render: (_, row) => (
        <span title={row.reason}>{reasonLabel(row.reason)}</span>
      ),
    },
    {
      title: t('app_insights.col_count'),
      key: 'count',
      align: 'right',
      width: 100,
      render: (_, row) => (
        <span className="tabular-nums">{formatInteger(row.count)}</span>
      ),
    },
    {
      title: t('app_insights.col_share'),
      key: 'share',
      width: 180,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
            <span
              className="block h-full rounded bg-red-500"
              style={{ width: `${Math.max(row.percent, 1)}%` }}
            />
          </span>
          <span className="w-12 text-right text-xs tabular-nums text-gray-500">
            {formatShare(row.percent)}
          </span>
        </div>
      ),
    },
    {
      title: t('app_insights.col_event_type'),
      key: 'types',
      render: (_, row) => (
        <span className="flex flex-wrap gap-1">
          {Object.entries(row.byType).map(([type, count]) => (
            <Tag key={type} className="m-0">
              {eventLabel(type as keyof typeof row.byType)}{' '}
              {formatInteger(count)}
            </Tag>
          ))}
        </span>
      ),
    },
    {
      title: t('app_insights.col_versions'),
      key: 'versions',
      render: (_, row) => (
        <span className="flex flex-col gap-0.5">
          {row.versions.slice(0, REASON_VERSION_LIMIT).map((version) => (
            <span
              key={version.hash}
              className="flex items-center gap-2 text-xs"
            >
              <VersionLabel hash={version.hash} name={version.name} compact />
              <span className="tabular-nums text-gray-500">
                {formatInteger(version.count)}
              </span>
            </span>
          ))}
          {row.versions.length > REASON_VERSION_LIMIT && (
            <span className="text-xs text-gray-400">
              {t('app_insights.more_versions', {
                count: row.versions.length - REASON_VERSION_LIMIT,
              })}
            </span>
          )}
        </span>
      ),
    },
  ];

  const topReason = summary.reasons[0];
  const worstOs = [...summary.os]
    .filter((row) => row.failureRate !== null)
    .sort(
      (left, right) => (right.failureRate ?? 0) - (left.failureRate ?? 0),
    )[0];

  return (
    <div className="flex flex-col gap-4">
      {breakdown.error ? <InsightsError error={breakdown.error} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Question>{t('app_insights.failures_intro')}</Question>
        <Select
          size="small"
          showSearch
          optionFilterProp="label"
          value={versionFilter}
          options={versionOptions}
          onChange={setVersionFilter}
          className="w-56"
        />
      </div>
      <Spin spinning={breakdown.isLoading}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <StatTile
            label={t('app_insights.failure_events', { days })}
            value={formatInteger(summary.failures)}
            hint={t('app_insights.failure_events_hint')}
            tone={summary.failures > 0 ? 'warning' : undefined}
          />
          <StatTile
            label={t('app_insights.top_reason')}
            value={
              topReason ? (
                <span className="text-base">
                  {reasonLabel(topReason.reason)}
                </span>
              ) : (
                '-'
              )
            }
            hint={
              topReason
                ? t('app_insights.top_reason_hint', {
                    percent: formatShare(topReason.percent),
                  })
                : t('app_insights.no_failures')
            }
          />
          <StatTile
            label={t('app_insights.worst_os')}
            value={
              worstOs ? <span className="text-base">{worstOs.key}</span> : '-'
            }
            hint={
              worstOs
                ? t('app_insights.worst_os_hint', {
                    percent: formatPercent(worstOs.failureRate),
                  })
                : t('app_insights.no_os_rows')
            }
          />
        </div>
      </Spin>

      <Card size="small" title={t('app_insights.reasons_title')}>
        <Question>{t('app_insights.reasons_question')}</Question>
        <Spin spinning={breakdown.isLoading}>
          {summary.reasons.length === 0 ? (
            <EmptyState>
              {breakdown.isLoading ? '' : t('app_insights.no_failures')}
            </EmptyState>
          ) : (
            <Table
              size="small"
              rowKey="reason"
              columns={reasonColumns}
              dataSource={summary.reasons}
              pagination={
                summary.reasons.length > 10 ? { pageSize: 10 } : false
              }
              scroll={{ x: 'max-content' }}
            />
          )}
        </Spin>
        <Footnote>{t('app_insights.reasons_footnote')}</Footnote>
      </Card>

      <Card size="small" title={t('app_insights.os_title')}>
        <Question>{t('app_insights.os_question')}</Question>
        <Spin spinning={breakdown.isLoading}>
          {summary.os.length === 0 ? (
            <EmptyState>
              {breakdown.isLoading ? '' : t('app_insights.no_events')}
            </EmptyState>
          ) : (
            <DimensionTable
              rows={summary.os}
              labelOf={(os) => os}
              keyTitle={t('app_insights.col_os')}
            />
          )}
        </Spin>
        <Footnote>{t('app_insights.rates_footnote')}</Footnote>
      </Card>

      <Card size="small" title={t('app_insights.carrier_events_title')}>
        <Question>{t('app_insights.carrier_events_question')}</Question>
        {versionFilter !== ALL ? (
          <EmptyState>{t('app_insights.carrier_no_version_filter')}</EmptyState>
        ) : (
          <Spin spinning={breakdown.isLoading}>
            {summary.carriers.length === 0 ? (
              <EmptyState>
                {breakdown.isLoading ? '' : t('app_insights.no_events')}
              </EmptyState>
            ) : (
              <DimensionTable
                rows={summary.carriers}
                labelOf={carrierLabel}
                keyTitle={t('app_insights.col_carrier')}
              />
            )}
          </Spin>
        )}
        <Footnote>
          {t('app_insights.breakdown_footnote', {
            retention: breakdown.data?.retentionDays ?? 35,
          })}
        </Footnote>
      </Card>
    </div>
  );
};
