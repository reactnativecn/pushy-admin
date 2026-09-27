import { Card, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DimensionRow,
  FAILURE_EVENT_TYPES,
  highestFailureDimension,
  type ReasonRow,
  summarizeBreakdown,
} from './logic';
import { ObservationNotice, ReportShare } from './observation-ui';
import {
  EmptyState,
  Footnote,
  formatInteger,
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
import { CLIENT_EVENT_TYPES, type ClientEventType } from './types';

const ALL = '__all__';
const DimensionTable = ({ rows, labelOf, keyTitle }: {
  rows: DimensionRow[];
  labelOf: (key: string) => string;
  keyTitle: string;
}) => {
  const { t } = useTranslation();
  const eventLabel = useEventTypeLabel();
  const columns: ColumnsType<DimensionRow> = [
    { title: keyTitle, key: 'key', render: (_, row) => labelOf(row.key) },
    ...CLIENT_EVENT_TYPES.map((type) => ({
      title: eventLabel(type),
      key: type,
      align: 'right' as const,
      render: (_: unknown, row: DimensionRow) => (
        <span className={FAILURE_EVENT_TYPES.has(type) && row.counts[type] > 0 ? 'text-red-500' : undefined}>
          {formatInteger(row.counts[type])}
        </span>
      ),
    })),
    {
      title: t('app_insights.col_failure_rate'),
      key: 'failureShare',
      render: (_, row) => <ReportShare part={row.counts.download_fail + row.counts.patch_fail} total={row.failureSamples} />,
    },
    {
      title: t('app_insights.col_rollback_rate'),
      key: 'rollbackShare',
      render: (_, row) => <ReportShare part={row.counts.rollback} total={row.rollbackSamples} />,
    },
  ];
  return <Table size="small" rowKey="key" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 'max-content' }} locale={{ emptyText: t('app_insights.no_observations') }} />;
};

export const FailuresPanel = ({ appKey, days }: { appKey: string | undefined; days: number }) => {
  const { t } = useTranslation();
  const reasonLabel = useFailureReasonLabel();
  const carrierLabel = useCarrierLabel();
  const eventLabel = useEventTypeLabel();
  const breakdown = useAppEventBreakdown(appKey, days);
  const [versionFilter, setVersionFilter] = useState(ALL);
  const all = useMemo(() => summarizeBreakdown(breakdown.data?.days), [breakdown.data]);
  const summary = useMemo(
    () => versionFilter === ALL ? all : summarizeBreakdown(breakdown.data?.days, versionFilter),
    [all, breakdown.data, versionFilter],
  );
  const hasObservations = summary.os.length > 0 || summary.reasons.length > 0 || summary.carriers.length > 0;
  const highest = highestFailureDimension(summary.os);
  const topReason = summary.reasons[0];
  const reasonColumns: ColumnsType<ReasonRow> = [
    { title: t('app_insights.col_reason'), key: 'reason', render: (_, row) => reasonLabel(row.reason) },
    { title: t('app_insights.col_count'), dataIndex: 'count', align: 'right', render: formatInteger },
    { title: t('app_insights.col_share'), dataIndex: 'percent', align: 'right', render: formatShare },
    {
      title: t('app_insights.col_event_type'),
      key: 'types',
      render: (_, row) => <span className="flex flex-wrap gap-1">{Object.entries(row.byType).map(([type, count]) => <Tag key={type}>{eventLabel(type as ClientEventType)} {formatInteger(count)}</Tag>)}</span>,
    },
    {
      title: t('app_insights.col_versions'),
      key: 'versions',
      render: (_, row) => (
        <div className="space-y-1">
          {row.versions.slice(0, 3).map((version) => <div key={version.hash}><VersionLabel hash={version.hash} name={version.name} compact /> {formatInteger(version.count)}</div>)}
          {row.versions.length > 3 && <span>{t('app_insights.more_versions', { count: row.versions.length - 3 })}</span>}
        </div>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      {breakdown.error && <InsightsError error={breakdown.error} />}
      <ObservationNotice window={breakdown.data?.window} source="business" updatedAt={breakdown.dataUpdatedAt} stale={!!breakdown.error && !!breakdown.data} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Question>{t('app_insights.failures_intro')}</Question>
        <Select
          showSearch
          optionFilterProp="label"
          value={versionFilter}
          onChange={setVersionFilter}
          className="w-64"
          options={[{ value: ALL, label: t('app_insights.filter_all_versions') }, ...Array.from(all.versionNames, ([hash, name]) => ({ value: hash, label: `${name ?? t('app_insights.version_deleted')} (${hash.slice(0, 8)})` }))]}
        />
      </div>
      <Spin spinning={breakdown.isLoading}>
        <div className="grid gap-2 md:grid-cols-3">
          <StatTile label={t('app_insights.failure_events', { days })} value={formatInteger(hasObservations ? summary.failures : null)} hint={t('app_insights.failure_events_hint')} />
          <StatTile label={t('app_insights.top_reason')} value={topReason ? reasonLabel(topReason.reason) : '-'} hint={topReason ? t('app_insights.top_reason_hint', { percent: formatShare(topReason.percent) }) : t('app_insights.no_observations')} />
          <StatTile
            label={t('app_insights.worst_os')}
            value={highest?.key ?? '-'}
            hint={highest ? <ReportShare part={highest.counts.download_fail + highest.counts.patch_fail} total={highest.failureSamples} /> : t('app_insights.no_ranked_os')}
          />
        </div>
      </Spin>
      <Card size="small" title={t('app_insights.reasons_title')}>
        <Spin spinning={breakdown.isLoading}>
          {summary.reasons.length > 0 ? (
            <Table size="small" rowKey="reason" dataSource={summary.reasons} columns={reasonColumns} pagination={summary.reasons.length > 10 ? { pageSize: 10 } : false} scroll={{ x: 'max-content' }} />
          ) : <EmptyState>{breakdown.isLoading ? '' : t('app_insights.no_observations')}</EmptyState>}
        </Spin>
        <Footnote>{t('app_insights.reasons_footnote')}</Footnote>
      </Card>
      <Card size="small" title={t('app_insights.os_title')}>
        <DimensionTable rows={summary.os} keyTitle={t('app_insights.col_os')} labelOf={(key) => key} />
        <Footnote>{t('app_insights.rates_footnote')}</Footnote>
      </Card>
      <Card size="small" title={t('app_insights.carrier_events_title')}>
        {versionFilter === ALL ? <DimensionTable rows={summary.carriers} keyTitle={t('app_insights.carriers_title')} labelOf={carrierLabel} /> : <EmptyState>{t('app_insights.carrier_no_version_filter')}</EmptyState>}
        <Footnote>{t('app_insights.rates_footnote')}</Footnote>
      </Card>
      <Footnote>{t('app_insights.breakdown_footnote', { retention: breakdown.data?.retentionDays ?? 35 })}</Footnote>
    </div>
  );
};
