import { AlertOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { QUOTA_ALERT_KIND_LABEL_KEY } from '@/constants/i18n-keys';
import { adminApi } from '@/services/admin-api';
import { formatCount } from '@/utils/format';
import { serviceStatusKeys } from '@/utils/query-keys';
import { StatusSection } from './status-section';

const { Text } = Typography;

const KIND_COLORS: Record<QuotaAlert['kind'], string> = {
  near_limit: 'orange',
  usage_drop: 'red',
  usage_spike: 'gold',
};

export const QuotaAlertsPanel = () => {
  const { t } = useTranslation();
  const alertsQuery = useQuery({
    queryKey: serviceStatusKeys.quotaAlerts(),
    queryFn: () => adminApi.getQuotaAlerts(),
    refetchInterval: 10 * 60_000,
    retry: false,
  });

  const alerts = alertsQuery.data?.data?.alerts ?? [];

  const columns: ColumnsType<QuotaAlert> = [
    {
      dataIndex: 'kind',
      render: (kind: QuotaAlert['kind']) => (
        <Tag color={KIND_COLORS[kind]}>
          {t(QUOTA_ALERT_KIND_LABEL_KEY[kind])}
        </Tag>
      ),
      title: '',
      width: 110,
    },
    {
      dataIndex: 'email',
      render: (email: string, row) => (
        <Space size={4}>
          <Text copyable className="text-xs">
            {email}
          </Text>
          <Tag>{row.tier}</Tag>
        </Space>
      ),
      title: t('user_analytics.quota_col_user'),
    },
    {
      align: 'right',
      key: 'usage',
      render: (_v, row) =>
        `${formatCount(row.usage)} / ${formatCount(row.quotaPv)}`,
      title: t('user_analytics.quota_col_usage'),
      width: 160,
    },
    {
      align: 'right',
      key: 'trend',
      render: (_v, row) =>
        `${formatCount(row.last7Avg)} / ${formatCount(row.prev7Avg)}`,
      title: t('user_analytics.quota_col_trend'),
      width: 160,
    },
  ];

  return (
    // 不传 loading：没有告警（含加载中）时整块不出现
    <StatusSection
      empty={alerts.length === 0}
      error={alertsQuery.isError}
      icon={<AlertOutlined />}
      title={t('user_analytics.quota_title')}
    >
      <Table
        columns={columns}
        dataSource={alerts}
        pagination={alerts.length > 10 ? { pageSize: 10 } : false}
        rowKey={(row) => `${row.userId}-${row.kind}`}
        size="small"
      />
    </StatusSection>
  );
};
