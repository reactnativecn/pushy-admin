import { DatabaseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  adminApi,
  type StorageUsageClass,
  type StorageUsageError,
} from '@/services/admin-api';
import { serviceStatusKeys } from '@/utils/query-keys';
import { formatCount } from './metrics';
import {
  buildTableRows,
  formatShare,
  formatStorageBytes,
  type StorageTableRow,
} from './storage-usage-panel.logic';

const { Text } = Typography;

const TOP_TABLES = 10;

const ERROR_KEYS: Record<StorageUsageError, string> = {
  access_denied: 'storage_usage.error_access_denied',
  not_configured: 'storage_usage.error_not_configured',
  unavailable: 'storage_usage.error_unavailable',
};

const CLASS_KEYS: Record<StorageUsageClass['class'], string> = {
  archive: 'storage_usage.class_archive',
  coldArchive: 'storage_usage.class_cold_archive',
  deepColdArchive: 'storage_usage.class_deep_cold_archive',
  infrequentAccess: 'storage_usage.class_infrequent_access',
  standard: 'storage_usage.class_standard',
};

const formatTime = (value: string | null | undefined) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';

export const StorageUsagePanel = () => {
  const { t } = useTranslation();
  const usageQuery = useQuery({
    queryKey: serviceStatusKeys.storageUsage(),
    queryFn: () => adminApi.getStorageUsage(),
    // 服务端缓存 5 分钟，OSS 统计本身约每小时才刷新，没有必要频繁轮询。
    refetchInterval: 10 * 60_000,
    retry: false,
  });

  // 旧版服务端没有这个接口时整块隐藏，与其他运维面板一致。
  if (usageQuery.isError) {
    return null;
  }
  const usage = usageQuery.data;
  const database = usage?.database;
  const oss = usage?.oss;

  const sectionError = (error: StorageUsageError | undefined) => (
    <Alert
      showIcon
      type="warning"
      title={t(ERROR_KEYS[error ?? 'unavailable'])}
    />
  );

  const otherTables = t('storage_usage.other_tables');
  const columns: ColumnsType<StorageTableRow> = [
    {
      dataIndex: 'name',
      render: (name: string, row) =>
        row.other ? (
          <Text type="secondary">{name}</Text>
        ) : (
          <Text code>{name}</Text>
        ),
      title: t('storage_usage.col_table'),
    },
    {
      align: 'right',
      dataIndex: 'rowsEstimate',
      render: (value: number) => formatCount(value),
      title: t('storage_usage.col_rows'),
      width: 130,
    },
    {
      align: 'right',
      dataIndex: 'dataBytes',
      render: (value: number) => formatStorageBytes(value),
      title: t('storage_usage.col_data'),
      width: 110,
    },
    {
      align: 'right',
      dataIndex: 'indexBytes',
      render: (value: number) => formatStorageBytes(value),
      title: t('storage_usage.col_index'),
      width: 110,
    },
    {
      align: 'right',
      dataIndex: 'freeBytes',
      render: (value: number) => formatStorageBytes(value),
      title: t('storage_usage.col_free'),
      width: 110,
    },
    {
      align: 'right',
      dataIndex: 'totalBytes',
      render: (value: number) => formatStorageBytes(value),
      title: t('storage_usage.col_total'),
      width: 110,
    },
    {
      align: 'right',
      dataIndex: 'share',
      render: (value: number) => formatShare(value, 1),
      title: t('storage_usage.col_share'),
      width: 90,
    },
  ];

  return (
    <Card
      className="mt-4"
      extra={
        usage && (
          <Text type="secondary">
            {t('storage_usage.generated_at', {
              time: formatTime(usage.generatedAt),
            })}
          </Text>
        )
      }
      loading={usageQuery.isLoading}
      title={
        <Space>
          <DatabaseOutlined />
          {t('storage_usage.title')}
        </Space>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          size="small"
          title={
            database?.schema
              ? `${t('storage_usage.database')} · ${database.schema}`
              : t('storage_usage.database')
          }
        >
          {database?.available ? (
            <>
              <Statistic
                title={t('storage_usage.database_total')}
                value={formatStorageBytes(database.totalBytes)}
              />
              <Text type="secondary">
                {t('storage_usage.database_breakdown', {
                  data: formatStorageBytes(database.dataBytes),
                  index: formatStorageBytes(database.indexBytes),
                  rows: formatCount(database.rowsEstimate),
                })}
              </Text>
              {database.freeBytes > 0 && (
                <div>
                  <Text type="secondary">
                    {t('storage_usage.database_free', {
                      free: formatStorageBytes(database.freeBytes),
                    })}
                  </Text>
                </div>
              )}
            </>
          ) : (
            sectionError(database?.error)
          )}
        </Card>
        <Card
          size="small"
          title={
            oss?.bucket
              ? `${t('storage_usage.oss')} · ${oss.bucket}`
              : t('storage_usage.oss')
          }
        >
          {oss?.available ? (
            <>
              <Statistic
                title={t('storage_usage.oss_total')}
                value={formatStorageBytes(oss.storageBytes)}
              />
              <Text type="secondary">
                {t('storage_usage.oss_objects', {
                  count: formatCount(oss.objectCount),
                })}
                {' · '}
                {t('storage_usage.oss_stat_updated', {
                  time: formatTime(oss.statUpdatedAt),
                })}
              </Text>
              <div className="mt-2">
                <Space size={4} wrap>
                  {oss.classes.map((item) => (
                    <Tag key={item.class}>
                      {t(CLASS_KEYS[item.class])}{' '}
                      {formatStorageBytes(item.bytes)}
                      {item.realBytes !== item.bytes &&
                        t('storage_usage.real_bytes', {
                          size: formatStorageBytes(item.realBytes),
                        })}
                      {' · '}
                      {formatCount(item.objectCount)}
                    </Tag>
                  ))}
                  {oss.multipartUploadCount > 0 && (
                    <Tag color="orange">
                      {t('storage_usage.oss_multipart', {
                        count: formatCount(oss.multipartUploadCount),
                      })}
                    </Tag>
                  )}
                </Space>
              </div>
            </>
          ) : (
            sectionError(oss?.error)
          )}
        </Card>
      </div>
      {database?.available && database.tables.length > 0 && (
        <Table
          columns={columns}
          dataSource={buildTableRows(database.tables, TOP_TABLES, otherTables)}
          pagination={false}
          rowKey="name"
          scroll={{ x: 'max-content' }}
          size="small"
        />
      )}
      <Text className="mt-2 block text-xs" type="secondary">
        {t('storage_usage.note')}
      </Text>
    </Card>
  );
};
