import { Card, Radio, Spin, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AsyncColumn } from '@/components/lazy-chart';
import { useThemeMode } from '@/utils/theme-mode';
import { RealtimeGeoPanel } from '../realtime-metrics-geo';
import {
  beijingToday,
  type PackageTrafficSummary,
  summarizeTraffic,
} from './logic';
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
        <div>
          {t('app_insights.package_observed_days', {
            count: row.observedDays,
            start: row.availableStart,
            end: row.availableEnd,
          })}
        </div>
      ) : (
        <div>{t('app_insights.no_observations')}</div>
      )}
      {row.partial && (
        <Tag color="orange">{t('app_insights.package_partial')}</Tag>
      )}
      {row.observedDays > 0 && row.expiredDays + row.unavailableDays > 0 && (
        <div className="text-gray-400">
          {t('app_insights.package_missing_days', {
            count: row.expiredDays + row.unavailableDays,
          })}
        </div>
      )}
    </div>
  );
};

export const TrafficPanel = ({
  appKey,
  days,
  isAdmin,
}: {
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
  const [hourlyDate, setHourlyDate] = useState<string | null>(null);
  const hourlyDay =
    summary.hourlyDays.find((item) => item.date === hourlyDate) ??
    summary.hourlyDays.at(-1);
  const hourlyData = (hourlyDay?.hourly ?? []).map((value, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    value,
  }));
  const today = traffic.data?.window?.today ?? beijingToday();
  const distributions = [
    {
      key: 'carriers',
      title: t('app_insights.carriers_title'),
      question: t('app_insights.carriers_question'),
      items: summary.carriers.map((row) => ({
        ...row,
        label: carrierLabel(row.key),
      })),
    },
    {
      key: 'hosts',
      title: t('app_insights.hosts_title'),
      question: t('app_insights.hosts_question'),
      items: summary.hosts.map((row) => ({ ...row, label: row.key })),
    },
    {
      key: 'ip',
      title: t('app_insights.ip_title'),
      question: t('app_insights.ip_question'),
      items: summary.ipVersion.map((row) => ({
        ...row,
        label:
          row.key === 'v4'
            ? 'IPv4'
            : row.key === 'v6'
              ? 'IPv6'
              : t('app_insights.ip_unknown'),
      })),
    },
  ];
  return (
    <div className="space-y-4">
      <RealtimeSeriesPanel appKey={appKey} isAdmin={isAdmin} />
      {!!traffic.error && <InsightsError error={traffic.error} />}
      <ObservationNotice
        window={traffic.data?.window}
        updatedAt={traffic.dataUpdatedAt}
        stale={!!traffic.error && !!traffic.data}
      />
      <Card
        size="small"
        title={t('app_insights.hourly_title')}
        extra={
          summary.hourlyDays.length > 1 && (
            <Radio.Group
              size="small"
              value={hourlyDay?.date}
              onChange={(event) => setHourlyDate(event.target.value)}
            >
              {summary.hourlyDays.map((item) => (
                <Radio.Button key={item.date} value={item.date}>
                  {item.date === today
                    ? t('app_insights.today')
                    : item.date.slice(5)}
                </Radio.Button>
              ))}
            </Radio.Group>
          )
        }
      >
        <Question>{t('app_insights.hourly_question')}</Question>
        <Spin spinning={traffic.isLoading}>
          {hourlyData.some((point) => point.value > 0) ? (
            <AsyncColumn
              theme={isDark ? 'classicDark' : 'classic'}
              data={hourlyData}
              xField="hour"
              yField="value"
              height={260}
              axis={{ x: { title: false }, y: { title: false } }}
            />
          ) : (
            <EmptyState>
              {traffic.isLoading ? '' : t('app_insights.no_observations')}
            </EmptyState>
          )}
        </Spin>
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
              {
                title: t('app_insights.col_package'),
                dataIndex: 'packageVersion',
              },
              {
                title: t('app_insights.requests'),
                dataIndex: 'requests',
                align: 'right',
                render: formatInteger,
              },
              {
                title: t('app_insights.request_share'),
                dataIndex: 'percent',
                align: 'right',
                render: formatShare,
              },
              {
                title: t('app_insights.col_peak_devices'),
                dataIndex: 'peakDevices',
                align: 'right',
                render: observedInteger,
              },
              {
                title: t('app_insights.col_availability'),
                key: 'availability',
                render: (_, row) => <PackageObservation row={row} />,
              },
            ]}
          />
        </Spin>
        <Footnote>
          {t('app_insights.packages_footnote', {
            requests: traffic.data?.retentionDays ?? 35,
            devices: traffic.data?.packageDevicesRetentionDays ?? 14,
          })}
        </Footnote>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {distributions.map((distribution) => (
          <Card size="small" title={distribution.title} key={distribution.key}>
            <Question>{distribution.question}</Question>
            <Spin spinning={traffic.isLoading}>
              {distribution.items.length > 0 ? (
                <BarList items={distribution.items} />
              ) : (
                <EmptyState>
                  {traffic.isLoading ? '' : t('app_insights.no_observations')}
                </EmptyState>
              )}
            </Spin>
          </Card>
        ))}
      </div>
      <RealtimeGeoPanel appKey={appKey} isAdmin={isAdmin} />
    </div>
  );
};
