import { GlobalOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import { formatCount, formatPercent } from '@/utils/format';
import { serviceStatusKeys } from '@/utils/query-keys';
import { StatCard, StatusSection } from './status-section';

const { Text } = Typography;

const TOP_COUNTRY_LIMIT = 6;

const topCountries = (countries: Record<string, number>) =>
  Object.entries(countries)
    .sort((left, right) => right[1] - left[1])
    .slice(0, TOP_COUNTRY_LIMIT);

const hitRate = (hit: Record<string, number>): number | null => {
  const incremental = (hit.hdiff ?? 0) + (hit.pdiff ?? 0);
  const total = incremental + (hit.full ?? 0);
  return total > 0 ? incremental / total : null;
};

export const UserAnalyticsPanel = () => {
  const { t } = useTranslation();
  const overviewQuery = useQuery({
    queryKey: serviceStatusKeys.analyticsOverview(7),
    queryFn: () => adminApi.getAnalyticsOverview(7),
    refetchInterval: 60_000,
    retry: false,
  });
  const growthQuery = useQuery({
    queryKey: serviceStatusKeys.growthStats(7),
    queryFn: () => adminApi.getGrowthStats(7),
    refetchInterval: 10 * 60_000,
    retry: false,
  });

  const days = overviewQuery.data?.data ?? [];
  const today = days[0];
  const latestGrowth = growthQuery.data?.data?.[0];

  const columns: ColumnsType<GlobalAnalyticsDay> = [
    { dataIndex: 'date', title: t('user_analytics.col_date'), width: 110 },
    {
      align: 'right',
      dataIndex: 'dau',
      render: (value: number) => formatCount(value),
      title: t('user_analytics.col_dau'),
      width: 90,
    },
    {
      dataIndex: 'countries',
      render: (countries: Record<string, number>) => (
        <Space size={4} wrap>
          {topCountries(countries).map(([country, count]) => (
            <Tag key={country}>
              {country} {formatCount(count)}
            </Tag>
          ))}
        </Space>
      ),
      title: t('user_analytics.col_countries'),
    },
    {
      dataIndex: 'topApps',
      render: (apps: GlobalAnalyticsDay['topApps']) => (
        <Space size={4} wrap>
          {apps.slice(0, 5).map((app) => (
            <Tag color="blue" key={app.appKey}>
              {app.appKey.slice(0, 10)}… {formatCount(app.dau)}
            </Tag>
          ))}
        </Space>
      ),
      title: t('user_analytics.col_top_apps'),
    },
  ];

  return (
    <StatusSection
      empty={days.length === 0}
      error={overviewQuery.isError}
      icon={<GlobalOutlined />}
      loading={overviewQuery.isLoading}
      title={t('user_analytics.title')}
    >
      {today && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            detail={
              latestGrowth && (
                <>
                  {t('user_analytics.mau')}{' '}
                  {formatCount(latestGrowth.mauGlobal)}
                  {latestGrowth.newDevicesGlobal !== null && (
                    <>
                      {' '}
                      · {t('user_analytics.new_devices')}{' '}
                      {formatCount(latestGrowth.newDevicesGlobal)}
                    </>
                  )}
                </>
              )
            }
            title={t('user_analytics.today_dau')}
            value={today.dau}
          />
          <StatCard
            detail={t('user_analytics.hit_rate_hint')}
            title={t('user_analytics.hit_rate')}
            value={formatPercent(hitRate(today.hit))}
          />
          <Card className="md:col-span-2" size="small">
            <Text type="secondary">{t('user_analytics.col_countries')}</Text>
            <div className="mt-2">
              <Space size={4} wrap>
                {topCountries(today.countries).map(([country, count]) => (
                  <Tag key={country}>
                    {country} {formatCount(count)}
                  </Tag>
                ))}
              </Space>
            </div>
          </Card>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={days}
        pagination={false}
        rowKey="date"
        size="small"
      />
    </StatusSection>
  );
};
