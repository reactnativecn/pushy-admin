import { Card, Spin, Table, theme } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AsyncColumn } from '@/components/lazy-chart';
import { useThemeMode } from '@/utils/theme-mode';
import { RealtimeGeoPanel } from '../realtime-metrics-geo';
import { summarizeTraffic } from './logic';
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
  const { token } = theme.useToken();
  const carrierLabel = useCarrierLabel();
  const traffic = useAppTraffic(appKey, days);
  const summary = useMemo(
    () => summarizeTraffic(traffic.data?.days),
    [traffic.data],
  );

  const hourlyData = summary.hourly.map((value, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    value,
  }));
  const hourlyTotal = summary.hourly.reduce((sum, value) => sum + value, 0);
  const hourlyConfig = {
    theme: isDark ? 'classicDark' : 'classic',
    data: hourlyData,
    xField: 'hour',
    yField: 'value',
    height: 260,
    style: { fill: token.colorPrimary, radiusTopLeft: 3, radiusTopRight: 3 },
    axis: {
      x: { title: false, labelAutoRotate: true },
      y: { title: false },
    },
    tooltip: {
      title: (point: { hour: string }) => point.hour,
      items: [
        (point: { value: number }) => ({
          name: t('app_insights.requests'),
          value: `${formatInteger(point.value)} (${formatShare(
            hourlyTotal > 0 ? (point.value / hourlyTotal) * 100 : 0,
          )})`,
        }),
      ],
    },
  };

  const hasTraffic = summary.requests > 0;

  return (
    <div className="flex flex-col gap-4">
      <RealtimeSeriesPanel appKey={appKey} isAdmin={isAdmin} />

      {traffic.error ? <InsightsError error={traffic.error} /> : null}
      <Card size="small" title={t('app_insights.hourly_title')}>
        <Question>{t('app_insights.hourly_question', { days })}</Question>
        <Spin spinning={traffic.isLoading}>
          {hasTraffic ? (
            <AsyncColumn {...hourlyConfig} />
          ) : (
            <EmptyState height="h-48">
              {traffic.isLoading ? '' : t('app_insights.no_traffic')}
            </EmptyState>
          )}
        </Spin>
        <Footnote>{t('app_insights.hourly_footnote')}</Footnote>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="small" title={t('app_insights.packages_title')}>
          <Question>{t('app_insights.packages_question')}</Question>
          <Spin spinning={traffic.isLoading}>
            {summary.packages.length > 0 ? (
              <Table
                size="small"
                rowKey="packageVersion"
                dataSource={summary.packages}
                pagination={
                  summary.packages.length > 10 ? { pageSize: 10 } : false
                }
                scroll={{ x: 'max-content' }}
                columns={[
                  {
                    title: t('app_insights.col_package'),
                    dataIndex: 'packageVersion',
                  },
                  {
                    title: t('app_insights.requests'),
                    dataIndex: 'requests',
                    align: 'right',
                    render: (value: number) => formatInteger(value),
                  },
                  {
                    title: t('app_insights.col_share'),
                    dataIndex: 'percent',
                    align: 'right',
                    render: (value: number) => formatShare(value),
                  },
                  {
                    title: t('app_insights.col_peak_devices'),
                    dataIndex: 'peakDevices',
                    align: 'right',
                    render: (value: number) =>
                      value > 0 ? (
                        formatInteger(value)
                      ) : (
                        <span className="text-gray-400">-</span>
                      ),
                  },
                ]}
              />
            ) : (
              <EmptyState>
                {traffic.isLoading ? '' : t('app_insights.no_traffic')}
              </EmptyState>
            )}
          </Spin>
          <Footnote>{t('app_insights.packages_footnote')}</Footnote>
        </Card>

        <Card size="small" title={t('app_insights.carriers_title')}>
          <Question>{t('app_insights.carriers_question')}</Question>
          <Spin spinning={traffic.isLoading}>
            {summary.carriers.length > 0 ? (
              <BarList
                items={summary.carriers.map((item) => ({
                  key: item.key,
                  label: carrierLabel(item.key),
                  title: item.key,
                  count: item.count,
                  percent: item.percent,
                  muted: item.key === 'unknown' || item.key === '其他',
                }))}
              />
            ) : (
              <EmptyState>
                {traffic.isLoading ? '' : t('app_insights.no_traffic')}
              </EmptyState>
            )}
          </Spin>
          <Footnote>{t('app_insights.carriers_footnote')}</Footnote>
        </Card>

        <Card size="small" title={t('app_insights.hosts_title')}>
          <Question>{t('app_insights.hosts_question')}</Question>
          <Spin spinning={traffic.isLoading}>
            {summary.hosts.length > 0 ? (
              <BarList
                items={summary.hosts.map((item) => ({
                  key: item.key,
                  label: item.key,
                  title: item.key,
                  count: item.count,
                  percent: item.percent,
                }))}
                restLabel={(count) => t('app_insights.more_hosts', { count })}
              />
            ) : (
              <EmptyState>
                {traffic.isLoading ? '' : t('app_insights.no_traffic')}
              </EmptyState>
            )}
          </Spin>
          <Footnote>{t('app_insights.hosts_footnote')}</Footnote>
        </Card>

        <Card size="small" title={t('app_insights.ip_title')}>
          <Question>{t('app_insights.ip_question')}</Question>
          <Spin spinning={traffic.isLoading}>
            {summary.ipVersion.length > 0 ? (
              <BarList
                items={summary.ipVersion.map((item) => ({
                  key: item.key,
                  label:
                    item.key === 'v4'
                      ? 'IPv4'
                      : item.key === 'v6'
                        ? 'IPv6'
                        : t('app_insights.ip_unknown'),
                  count: item.count,
                  percent: item.percent,
                  muted: item.key !== 'v4' && item.key !== 'v6',
                }))}
              />
            ) : (
              <EmptyState>
                {traffic.isLoading ? '' : t('app_insights.no_traffic')}
              </EmptyState>
            )}
          </Spin>
          <Footnote>{t('app_insights.ip_footnote')}</Footnote>
        </Card>
      </div>

      <RealtimeGeoPanel appKey={appKey} isAdmin={isAdmin} />
    </div>
  );
};
