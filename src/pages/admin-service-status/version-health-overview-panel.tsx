import { HeartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { adminApi } from '@/services/admin-api';
import { formatCount, formatPercent } from './metrics';

const { Text } = Typography;

// 阈值:回滚率 >5% 异常、>1% 关注;样本太少(<10)不判定
const CRITICAL_ROLLBACK = 0.05;
const WARNING_ROLLBACK = 0.01;
const MIN_SAMPLES = 10;

function healthTag(row: VersionHealthOverviewRow, t: (key: string) => string) {
  if (row.startSamples < MIN_SAMPLES || row.rollbackRate === null) {
    return null;
  }
  if (row.rollbackRate >= CRITICAL_ROLLBACK) {
    return <Tag color="red">{t('user_analytics.vh_critical')}</Tag>;
  }
  if (row.rollbackRate >= WARNING_ROLLBACK) {
    return <Tag color="orange">{t('user_analytics.vh_warning')}</Tag>;
  }
  return <Tag color="green">{t('user_analytics.vh_healthy')}</Tag>;
}

export const VersionHealthOverviewPanel = () => {
  const { t } = useTranslation();
  const overviewQuery = useQuery({
    queryKey: ['versionHealthOverview'],
    queryFn: () => adminApi.getVersionHealthOverview(7),
    refetchInterval: 5 * 60_000,
    retry: false,
  });

  const rows = overviewQuery.data?.data ?? [];
  if (
    overviewQuery.isError ||
    (!overviewQuery.isLoading && rows.length === 0)
  ) {
    return null;
  }

  const columns: ColumnsType<VersionHealthOverviewRow> = [
    {
      key: 'health',
      render: (_v, row) => healthTag(row, t),
      title: '',
      width: 70,
    },
    {
      dataIndex: 'appName',
      render: (name: string, row) =>
        row.appKey ? (
          <Link to={`/version-health?appKey=${encodeURIComponent(row.appKey)}`}>
            {name}
          </Link>
        ) : (
          name
        ),
      title: t('user_analytics.vh_col_app'),
    },
    {
      dataIndex: 'hash',
      render: (hash: string, row) => (
        <Space direction="vertical" size={0}>
          <Text className="font-mono text-xs">{hash.slice(0, 12)}…</Text>
          <Text type="secondary" className="text-xs">
            pkg {row.packageVersion}
          </Text>
        </Space>
      ),
      title: t('user_analytics.vh_col_version'),
      width: 150,
    },
    {
      key: 'events',
      render: (_v, row) => (
        <Space size={4} wrap>
          {Object.entries(row.counts).map(([type, count]) => (
            <Tag key={type}>
              {type} {formatCount(count)}
            </Tag>
          ))}
        </Space>
      ),
      title: t('user_analytics.vh_col_events'),
    },
    {
      align: 'right',
      dataIndex: 'rollbackRate',
      render: (value: number | null) =>
        value === null ? '-' : formatPercent(value),
      title: t('user_analytics.vh_col_rollback'),
      width: 100,
    },
    {
      align: 'right',
      dataIndex: 'downloadFailRate',
      render: (value: number | null) =>
        value === null ? '-' : formatPercent(value),
      title: t('user_analytics.vh_col_download_fail'),
      width: 110,
    },
  ];

  return (
    <Card
      className="mt-4"
      loading={overviewQuery.isLoading}
      title={
        <Space>
          <HeartOutlined />
          {t('user_analytics.vh_title')}
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: t('user_analytics.vh_empty') }}
        pagination={rows.length > 8 ? { pageSize: 8 } : false}
        rowKey={(row) => `${row.appKey}-${row.hash}-${row.packageVersion}`}
        size="small"
      />
    </Card>
  );
};
