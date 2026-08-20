import { DeleteOutlined, LineChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Space,
  Spin,
  Table,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { adminApi } from '@/services/admin-api';
import { adminKeys } from '@/utils/query-keys';

// Collapse 面板默认首次展开才挂载子内容，借此实现按需拉取包列表
const AppPackagesTable = ({ appId }: { appId: number }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.appPackages(appId),
    queryFn: () => adminApi.getAppPackages(appId),
  });

  return (
    <Table
      dataSource={data?.data ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={{ pageSize: 5, size: 'small' }}
      size="small"
      columns={[
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 60,
        },
        {
          title: t('admin_users.pkg_name'),
          dataIndex: 'name',
          key: 'name',
        },
        {
          title: 'Hash',
          dataIndex: 'hash',
          key: 'hash',
          width: 100,
          render: (h: string) => (
            <code className="text-xs">{h.slice(0, 8)}</code>
          ),
        },
        {
          title: 'Build',
          key: 'build',
          render: (_, r) => r.buildTime || '-',
        },
        {
          title: t('admin_users.col_status'),
          dataIndex: 'status',
          key: 'status',
          width: 80,
        },
        {
          title: t('admin_users.col_note'),
          dataIndex: 'note',
          key: 'note',
        },
      ]}
    />
  );
};

export const UserDetailDrawer = ({
  userId,
  open,
  onClose,
  isMobile,
  onDelete,
  isDeleting,
}: {
  userId: number | null;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  onDelete?: (record: { id: number; email: string }) => void;
  isDeleting?: boolean;
}) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.userDetail(userId),
    queryFn: () => (userId ? adminApi.getUserDetail(userId) : null),
    enabled: !!userId && open,
  });

  const translate = (key: string) => t(key);

  const detail = data;

  return (
    <Drawer
      title={translate('admin_users.detail_title')}
      width={isMobile ? '100%' : 720}
      onClose={onClose}
      open={open}
      destroyOnHidden
      extra={
        detail?.user &&
        (detail.user.status === 'dormant' ||
          detail.user.status === 'unverified') ? (
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={isDeleting}
            onClick={() => onDelete?.(detail.user)}
          >
            {translate('admin_users.delete')}
          </Button>
        ) : null
      }
    >
      <Spin spinning={isLoading}>
        {detail && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions
              title={translate('admin_users.basic_info')}
              bordered
              column={2}
            >
              <Descriptions.Item label="ID">{detail.user.id}</Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_name')}>
                {detail.user.name}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_email')}
                span={2}
              >
                {detail.user.email}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_status')}>
                <Badge
                  status={
                    detail.user.status === 'normal'
                      ? 'success'
                      : detail.user.status === 'dormant'
                        ? 'default'
                        : 'warning'
                  }
                  text={
                    detail.user.status === 'normal'
                      ? translate('admin_users.status_normal')
                      : detail.user.status === 'dormant'
                        ? translate('admin_users.status_dormant')
                        : translate('admin_users.status_unverified')
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_tier')}>
                {detail.user.tier}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_tier_expires')}
                span={2}
              >
                {detail.user.tierExpiresAt
                  ? dayjs(detail.user.tierExpiresAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_created')}>
                {detail.user.createdAt
                  ? dayjs(detail.user.createdAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.last_operation')}
              >
                {detail.activity?.lastOperationAt
                  ? dayjs(detail.activity.lastOperationAt).format(
                      'YYYY-MM-DD HH:mm',
                    )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.dormant_marked_at')}
                span={2}
              >
                {detail.activity?.dormantMarkedAt
                  ? dayjs(detail.activity.dormantMarkedAt).format(
                      'YYYY-MM-DD HH:mm',
                    )
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title={translate('admin_users.quota_usage')}
              bordered
              column={2}
            >
              <Descriptions.Item label={translate('admin_users.pv_limit')}>
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.limit.pv,
                })}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.today_used')}>
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.todayUsed,
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.today_remaining')}
              >
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.todayRemaining,
                })}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.avg_7_days')}>
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.last7Days.avg,
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.last_7_days_details')}
                span={2}
              >
                {detail.quotaDetail.last7Days.counts
                  .slice()
                  .reverse()
                  .map((c, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length ordered day list, index is the stable identity
                    <span key={i} className="mr-3 inline-block">
                      {t('admin_users.day_label', { day: i + 1 })}:{' '}
                      <strong>{c}</strong>
                    </span>
                  ))}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.app_limit')}>
                {detail.apps.length} / {detail.quotaDetail.limit.app}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.package_limit')}>
                {t('admin_users.packages_value', {
                  value: detail.quotaDetail.limit.package,
                })}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <div
                className="ant-descriptions-title"
                style={{ marginBottom: 12 }}
              >
                {translate('admin_users.apps_and_packages')}
              </div>
              <Collapse>
                {detail.apps.map((app) => (
                  <Collapse.Panel
                    key={app.id}
                    header={
                      <div className="flex w-full justify-between pr-4 items-center">
                        <span>
                          <strong>{app.name}</strong> ({app.platform})
                        </span>
                        <Space size="middle">
                          <span>
                            PV: <strong>{app.checkCount}</strong>
                          </span>
                          <span>
                            {translate('admin_users.packages_count')}:{' '}
                            <strong>{app.packagesCount}</strong>
                          </span>
                          <Link
                            to={`${rootRouterPath.realtimeMetrics}?${new URLSearchParams(
                              { appKey: app.appKey },
                            ).toString()}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              type="link"
                              size="small"
                              icon={<LineChartOutlined />}
                              className="p-0!"
                            >
                              {translate('admin_apps.metrics')}
                            </Button>
                          </Link>
                        </Space>
                      </div>
                    }
                  >
                    <Space direction="vertical" className="w-full">
                      <div className="text-xs text-gray-500 mb-2">
                        App Key: <code>{app.appKey}</code>
                      </div>
                      <AppPackagesTable appId={app.id} />
                    </Space>
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          </Space>
        )}
      </Spin>
    </Drawer>
  );
};
