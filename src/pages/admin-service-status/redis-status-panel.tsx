import { ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Progress,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, type RedisStatusSnapshot } from '@/services/admin-api';
import { serviceStatusKeys } from '@/utils/query-keys';
import { formatCount, formatPercent, formatUptime } from './metrics';
import {
  formatExpiringShare,
  formatKBps,
  formatLatency,
  formatTtl,
  usageLevel,
  usageRatio,
} from './redis-status-panel.logic';
import { formatStorageBytes } from './storage-usage-panel.logic';

const { Text } = Typography;

const TOP_ERRORS = 8;

type KeyspaceRow = RedisStatusSnapshot['keyspace'][number];

const UsageBar = ({ ratio }: { ratio: number | null }) => {
  const { token } = theme.useToken();
  if (ratio == null) {
    return null;
  }
  const level = usageLevel(ratio);
  return (
    <Progress
      percent={Math.min(100, Number((ratio * 100).toFixed(1)))}
      size="small"
      status={level === 'danger' ? 'exception' : 'normal'}
      strokeColor={level === 'warning' ? token.colorWarning : undefined}
    />
  );
};

const Detail = ({ children }: { children: ReactNode }) => (
  <div>
    <Text type="secondary">{children}</Text>
  </div>
);

export const RedisStatusPanel = () => {
  const { t } = useTranslation();
  const statusQuery = useQuery({
    queryKey: serviceStatusKeys.redisStatus(),
    queryFn: () => adminApi.getRedisStatus(),
    // 服务端缓存 10 秒；30 秒刷新足够看出趋势，也不给 Redis 加压。
    refetchInterval: 30_000,
    retry: false,
  });

  // 旧版服务端没有这个接口时整块隐藏，与其他运维面板一致。
  if (statusQuery.isError) {
    return null;
  }
  const status = statusQuery.data;
  const server = status?.server;

  const keyspaceColumns: ColumnsType<KeyspaceRow> = [
    {
      dataIndex: 'db',
      render: (db: string) => <Text code>{db}</Text>,
      title: t('redis_status.col_db'),
    },
    {
      align: 'right',
      dataIndex: 'keys',
      render: (value: number) => formatCount(value),
      title: t('redis_status.col_keys'),
    },
    {
      align: 'right',
      dataIndex: 'expires',
      render: (value: number, row) =>
        row.keys > 0
          ? `${formatCount(value)} (${formatExpiringShare(value, row.keys)})`
          : formatCount(value),
      title: t('redis_status.col_expires'),
    },
    {
      align: 'right',
      dataIndex: 'avgTtlMs',
      render: (value: number) => formatTtl(value),
      title: t('redis_status.col_avg_ttl'),
    },
  ];

  const serverSummary = () => {
    if (!status?.available || !server) {
      return null;
    }
    return (
      <Space size={4} wrap>
        {server.version && <Tag>v{server.version}</Tag>}
        {server.role && (
          <Tag color={server.role === 'master' ? 'blue' : 'default'}>
            {server.role}
            {server.replicas > 0 &&
              ` · ${t('redis_status.replicas', { count: server.replicas })}`}
          </Tag>
        )}
        {server.mode && <Tag>{server.mode}</Tag>}
        <Tag>
          {t('redis_status.uptime', {
            uptime: formatUptime(server.uptimeSeconds),
          })}
        </Tag>
      </Space>
    );
  };

  const serverBody = (snapshot: RedisStatusSnapshot) => {
    const { clients, memory, stats } = snapshot;
    const memoryRatio = usageRatio(memory.usedBytes, memory.maxBytes);
    const clientRatio = usageRatio(clients.connected, clients.max);
    const errors = snapshot.errors.slice(0, TOP_ERRORS);
    return (
      <>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card size="small">
            <Statistic
              title={t('redis_status.memory')}
              value={formatStorageBytes(memory.usedBytes)}
              suffix={
                memory.maxBytes > 0 ? (
                  <Text type="secondary">
                    / {formatStorageBytes(memory.maxBytes)}
                  </Text>
                ) : undefined
              }
            />
            <UsageBar ratio={memoryRatio} />
            <Detail>
              {t('redis_status.memory_detail', {
                peak: formatStorageBytes(memory.peakBytes),
                rss: formatStorageBytes(memory.rssBytes),
              })}
            </Detail>
            <Detail>
              {t('redis_status.memory_policy', {
                policy: memory.policy || '-',
                ratio: memory.fragmentationRatio
                  ? memory.fragmentationRatio.toFixed(2)
                  : '-',
              })}
            </Detail>
          </Card>
          <Card size="small">
            <Statistic
              title={t('redis_status.clients')}
              value={formatCount(clients.connected)}
              suffix={
                clients.max > 0 ? (
                  <Text type="secondary">/ {formatCount(clients.max)}</Text>
                ) : undefined
              }
            />
            <UsageBar ratio={clientRatio} />
            <Detail>
              {t('redis_status.clients_detail', {
                blocked: formatCount(clients.blocked),
                pubsub: formatCount(clients.pubsub),
              })}
            </Detail>
            {clients.rejected > 0 && (
              <Text type="danger">
                {t('redis_status.clients_rejected', {
                  count: formatCount(clients.rejected),
                })}
              </Text>
            )}
          </Card>
          <Card size="small">
            <Statistic
              title={t('redis_status.throughput')}
              value={formatCount(stats.opsPerSec)}
              suffix={<Text type="secondary">ops/s</Text>}
            />
            <Detail>
              {t('redis_status.throughput_detail', {
                input: formatKBps(stats.inputKbps),
                output: formatKBps(stats.outputKbps),
              })}
            </Detail>
            <Detail>
              {t('redis_status.total_commands', {
                count: formatCount(stats.totalCommands),
              })}
            </Detail>
          </Card>
          <Card size="small">
            <Statistic
              title={t('redis_status.hit_rate')}
              value={stats.hitRate == null ? '-' : formatPercent(stats.hitRate)}
            />
            <Detail>
              {t('redis_status.hit_detail', {
                hits: formatCount(stats.keyspaceHits),
                misses: formatCount(stats.keyspaceMisses),
              })}
            </Detail>
            <Detail>
              {t('redis_status.expired_keys', {
                count: formatCount(stats.expiredKeys),
              })}
            </Detail>
            {stats.evictedKeys > 0 ? (
              <Text type="warning">
                {t('redis_status.evicted_keys', {
                  count: formatCount(stats.evictedKeys),
                })}
              </Text>
            ) : (
              <Detail>{t('redis_status.no_evictions')}</Detail>
            )}
          </Card>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card size="small" title={t('redis_status.keyspace')}>
            {snapshot.keyspace.length > 0 ? (
              <Table
                columns={keyspaceColumns}
                dataSource={snapshot.keyspace}
                pagination={false}
                rowKey="db"
                scroll={{ x: 'max-content' }}
                size="small"
              />
            ) : (
              <Text type="secondary">{t('redis_status.keyspace_empty')}</Text>
            )}
          </Card>
          <Card
            size="small"
            title={t('redis_status.error_replies', {
              count: formatCount(stats.errorReplies),
            })}
          >
            {errors.length > 0 ? (
              <Space size={4} wrap>
                {errors.map((item) => (
                  <Tag key={item.prefix}>
                    {item.prefix} {formatCount(item.count)}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">{t('redis_status.no_errors')}</Text>
            )}
            <Text className="mt-2 block text-xs" type="secondary">
              {t('redis_status.error_note')}
            </Text>
          </Card>
        </div>
      </>
    );
  };

  const nodeCard = (node: RedisStatusSnapshot['node']) => {
    const { pool } = node;
    return (
      <Card
        size="small"
        title={
          node.hostname
            ? `${t('redis_status.node')} · ${node.hostname}`
            : t('redis_status.node')
        }
      >
        <Space orientation="vertical" size={4}>
          <Text>
            {t('redis_status.pool', {
              idle: formatCount(pool.idleConns),
              size: pool.poolSize > 0 ? formatCount(pool.poolSize) : '-',
              total: formatCount(pool.totalConns),
            })}
            {pool.pendingRequests > 0 && (
              <Text type="warning">
                {' · '}
                {t('redis_status.pool_pending', {
                  count: formatCount(pool.pendingRequests),
                })}
              </Text>
            )}
          </Text>
          <Text type="secondary">
            {t('redis_status.pool_counters', {
              hits: formatCount(pool.hits),
              misses: formatCount(pool.misses),
              stale: formatCount(pool.staleConns),
              timeouts: formatCount(pool.timeouts),
              waits: formatCount(pool.waitCount),
            })}
          </Text>
          <Space size={4} wrap>
            <Text type="secondary">{t('redis_status.circuits')}</Text>
            {node.circuits.map((circuit) => (
              <Tag color={circuit.open ? 'red' : 'green'} key={circuit.group}>
                {circuit.group}{' '}
                {circuit.open
                  ? t('redis_status.circuit_open')
                  : t('redis_status.circuit_closed')}
              </Tag>
            ))}
          </Space>
        </Space>
      </Card>
    );
  };

  return (
    <Card
      className="mt-4"
      extra={
        status && (
          <Text type="secondary">
            {t('redis_status.generated_at', {
              time: dayjs(status.generatedAt).format('HH:mm:ss'),
            })}
            {status.available &&
              ` · ${t('redis_status.latency', {
                latency: formatLatency(status.latencyMs),
              })}`}
          </Text>
        )
      }
      loading={statusQuery.isLoading}
      title={
        <Space wrap>
          <ThunderboltOutlined />
          {t('redis_status.title')}
          {serverSummary()}
        </Space>
      }
    >
      {status &&
        (status.available ? (
          serverBody(status)
        ) : (
          <Alert
            className="mb-4"
            showIcon
            type="error"
            title={t('redis_status.error_unavailable')}
          />
        ))}
      {status && nodeCard(status.node)}
      <Text className="mt-2 block text-xs" type="secondary">
        {t('redis_status.note')}
      </Text>
    </Card>
  );
};
