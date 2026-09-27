import { Card, Spin, Table, Tag } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AsyncColumn } from '@/components/lazy-chart';
import { useThemeMode } from '@/utils/theme-mode';
import { RealtimeGeoPanel } from '../realtime-metrics-geo';
import { type PackageTrafficSummary, summarizeTraffic } from './logic';
import { ObservationNotice, observedInteger } from './observation-ui';
import { RealtimeSeriesPanel } from './realtime-series-panel';
import {
  BarList,
  EmptyState,
  Footnote,
  formatInteger,
  formatShare,
  InsightsError,
  Question,
  useAppTraffic,
  useCarrierLabel,
} from './shared';

export const PackageObservation = ({ row }: { row: PackageTrafficSummary }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 text-xs">
      {row.observedDays > 0 ? (
        <div>{t('app_insights.package_observed_days', {
          count: row.observedDays,
          start: row.availableStart,
          end: row.availableEnd,
        })}</div>
      ) : <div>{t('app_insights.no_observations')}</div>}
      {row.partial && <Tag color="orange">{t('app_insights.package_partial')}</Tag>}
      {(row.expiredDays > 0 || row.unavailableDays > 0) && (
        <div>{t('app_insights.package_missing_days', {
          expired: row.expiredDays,
          missing: row.unavailableDays,
        })}</div>
      )}
    </div>
  );
};

export const TrafficPanel = ({ appKey, days, isAdmin }: {
  appKey: string | undefined;
  days: number;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const carrierLabel = useCarrierLabel();
  const traffic = useAppTraffic(appKey, days);
  const summary = useMemo(
    () => summarizeTraffic(traffic.data?.days, traffic.data?.window?.today),
    [traffic.data],
  );
  const hourlyData = summary.hourly.map((value, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    value,
  }));
  const distributions = [
    {
      key: 'carriers',
      title: t('app_insights.carriers_title'),
      question: t('app_insights.carriers_question'),
      footnote: t('app_insights.carriers_footnote'),
      items: summary.carriers.map((row) => ({ ...row, label: carrierLabel(row.key) })),
    },
    {
      key: 'hosts',
      title: t('app_insights.hosts_title'),
      question: t('app_insights.hosts_question'),
      footnote: t('app_insights.hosts_footnote'),
      items: summary.hosts.map((row) => ({ ...row, label: row.key })),
    },
    {
      key: 'ip',
      title: t('app_insights.ip_title'),
      question: t('app_insights.ip_question'),
      footnote: t('app_insights.ip_footnote'),
      items: summary.ipVersion.map((row) => ({
        ...row,
        label: row.key === 'v4' ? 'IPv4' : row.key === 'v6' ? 'IPv6' : t('app_insights.ip_unknown'),
      })),
    },
  ];
  return (
    <div className="space-y-4">
      <RealtimeSeriesPanel appKey={appKey} isAdmin={isAdmin} />
      {traffic.error && <InsightsError error={traffic.error} />}
      <ObservationNotice window={traffic.data?.window} source="business" updatedAt={traffic.dataUpdatedAt} stale={!!traffic.error && !!traffic.data} />
      <Card size="small" title={t('app_insights.hourly_title')}>
        <Question>{t('app_insights.hourly_question', { days })}</Question>
        <Spin spinning={traffic.isLoading}>
          {summary.requests > 0 ? (
            <AsyncColumn theme={isDark ? 'classicDark' : 'classic'} data={hourlyData} xField="hour" yField="value" height={260} axis={{ x: { title: false }, y: { title: false } }} />
          ) : <EmptyState>{traffic.isLoading ? '' : t('app_insights.no_observations')}</EmptyState>}
        </Spin>
        <Footnote>{t('app_insights.hourly_footnote')}</Footnote>
      </Card>
      <Card size="small" title={t('app_insights.packages_title')}>
        <Question>{t('app_insights.packages_question')}</Question>
        <Spin spinning={traffic.isLoading}>
          <Table
            size="small"
            rowKey="packageVersion"
            dataSource={summary.packages}
            pagination={summary.packages.length > 10 ? { pageSize: 10 } : false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: t('app_insights.no_observations') }}
            columns={[
              { title: t('app_insights.col_package'), dataIndex: 'packageVersion' },
              { title: t('app_insights.requests'), dataIndex: 'requests', align: 'right', render: formatInteger },
              { title: t('app_insights.request_share'), dataIndex: 'percent', align: 'right', render: formatShare },
              { title: t('app_insights.col_peak_devices'), dataIndex: 'peakDevices', align: 'right', render: observedInteger },
              { title: t('app_insights.col_availability'), key: 'availability', render: (_, row) => <PackageObservation row={row} /> },
            ]}
          />
        </Spin>
        <Footnote>{t('app_insights.packages_footnote', {
          requests: traffic.data?.retentionDays ?? 35,
          devices: traffic.data?.packageDevicesRetentionDays ?? 14,
        })}</Footnote>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {distributions.map((distribution) => (
          <Card size="small" title={distribution.title} key={distribution.key}>
            <Question>{distribution.question}</Question>
            <Spin spinning={traffic.isLoading}>
              {distribution.items.length > 0 ? <BarList items={distribution.items} /> : <EmptyState>{traffic.isLoading ? '' : t('app_insights.no_observations')}</EmptyState>}
            </Spin>
            <Footnote>{distribution.footnote} {t('app_insights.request_share')}</Footnote>
          </Card>
        ))}
      </div>
      <RealtimeGeoPanel appKey={appKey} isAdmin={isAdmin} />
    </div>
  );
};
