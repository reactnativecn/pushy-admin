import { CloudServerOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  adminApi,
  type CdnNodeStats,
  type CdnStatsWindow,
} from '@/services/admin-api';
import { formatBytes, formatCount, formatPercent } from '@/utils/format';
import { serviceStatusKeys } from '@/utils/query-keys';
import {
  averageGetMs,
  averageMbps,
  certDaysLeft,
  formatMbps,
  safeRatio,
} from './cdn-status-panel.logic';
import {
  formatLatency,
  usageLevel,
  usageRatio,
} from './redis-status-panel.logic';
import { StatCard, StatusSection } from './status-section';

const { Text } = Typography;

const CERT_WARNING_DAYS = 14;

type WindowRow = CdnStatsWindow & { key: string; label: string };

const NodeStats = ({ node }: { node: CdnNodeStats }) => {
  const { t } = useTranslation();
  const { last5m, last1h, last24h } = node.windows;
  const diskRatio = usageRatio(node.cacheUsedBytes, node.cacheTotalBytes);
  const certDays = certDaysLeft(node.certNotAfter, Date.now());

  const rows: WindowRow[] = [
    { ...last5m, key: 'last5m', label: t('cdn_status.window_5m') },
    { ...last1h, key: 'last1h', label: t('cdn_status.window_1h') },
    { ...last24h, key: 'last24h', label: t('cdn_status.window_24h') },
  ];
  const count = (dataIndex: keyof CdnStatsWindow, title: string) => ({
    align: 'right' as const,
    dataIndex,
    render: (value: number) => formatCount(value),
    title,
  });
  const columns: ColumnsType<WindowRow> = [
    { dataIndex: 'label', title: t('cdn_status.col_window') },
    count('requests', t('cdn_status.col_requests')),
    count('getRequests', t('cdn_status.col_get')),
    count('headRequests', t('cdn_status.col_head')),
    {
      align: 'right',
      key: 'average',
      render: (_, row) =>
        formatMbps(averageMbps(row.txBytes, row.coveredSeconds)),
      title: t('cdn_status.col_average'),
    },
    {
      align: 'right',
      dataIndex: 'peakTxMbps',
      render: (value: number) => formatMbps(value),
      title: t('cdn_status.col_peak'),
    },
    {
      align: 'right',
      dataIndex: 'txBytes',
      render: (value: number) => formatBytes(value),
      title: t('cdn_status.col_tx'),
    },
    {
      align: 'right',
      dataIndex: 'rxBytes',
      render: (value: number) => formatBytes(value),
      title: t('cdn_status.col_rx'),
    },
    {
      align: 'right',
      key: 'hit',
      render: (_, row) =>
        formatPercent(
          safeRatio(row.cacheHits, row.cacheHits + row.cacheMisses),
        ),
      title: t('cdn_status.col_hit'),
    },
    {
      align: 'right',
      key: 'duration',
      render: (_, row) =>
        formatLatency(averageGetMs(row.getTimeMsSum, row.getRequests)),
      title: t('cdn_status.col_duration'),
    },
    count('status2xx', '2xx'),
    count('status3xx', t('cdn_status.col_shed')),
    count('status4xx', '4xx'),
    count('status5xx', '5xx'),
  ];

  const hitRatio = safeRatio(
    last1h.cacheHits,
    last1h.cacheHits + last1h.cacheMisses,
  );
  const downloadRatio = safeRatio(last1h.getRequests, last1h.headRequests);
  const diskLevel = usageLevel(diskRatio);

  return (
    <Card
      className="mb-4 last:mb-0"
      size="small"
      title={
        <Space size={4} wrap>
          <Text code>{node.host}</Text>
          {node.stale ? (
            <Tag color="error">
              {t('cdn_status.stale', {
                time: dayjs.unix(node.collectedAt).format('MM-DD HH:mm:ss'),
              })}
            </Tag>
          ) : (
            <Tag color="success">{t('cdn_status.reporting')}</Tag>
          )}
          {node.nginx !== 'active' && (
            <Tag color="error">nginx: {node.nginx}</Tag>
          )}
          {node.shedMonitor !== 'active' && (
            <Tag color="error">
              {t('cdn_status.shed_monitor_down', { state: node.shedMonitor })}
            </Tag>
          )}
          {node.shedActive && (
            <Tag color="warning">{t('cdn_status.shedding')}</Tag>
          )}
        </Space>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail={t('cdn_status.bandwidth_detail', {
            peak: formatMbps(last24h.peakTxMbps),
          })}
          title={t('cdn_status.bandwidth')}
          value={formatMbps(averageMbps(last5m.txBytes, last5m.coveredSeconds))}
        />
        <StatCard
          detail={t('cdn_status.hit_detail', {
            bytes: formatBytes(last1h.hitBytes),
          })}
          title={t('cdn_status.hit_rate')}
          value={formatPercent(hitRatio)}
        />
        <StatCard
          detail={t('cdn_status.traffic_detail', {
            connections: formatCount(node.activeConnections),
            ratio: formatPercent(downloadRatio),
          })}
          title={t('cdn_status.requests')}
          value={formatCount(last1h.requests)}
        />
        <StatCard
          title={t('cdn_status.cache_disk')}
          value={formatBytes(node.cacheUsedBytes)}
          suffix={
            <Text type="secondary">/ {formatBytes(node.cacheTotalBytes)}</Text>
          }
        >
          {diskRatio != null && (
            <Progress
              percent={Math.min(100, Number((diskRatio * 100).toFixed(1)))}
              size="small"
              status={diskLevel === 'danger' ? 'exception' : 'normal'}
            />
          )}
          <div>
            <Text
              type={
                certDays == null || certDays < CERT_WARNING_DAYS
                  ? 'danger'
                  : 'secondary'
              }
            >
              {certDays == null
                ? t('cdn_status.cert_unknown')
                : t('cdn_status.cert_days', { days: certDays })}
            </Text>
          </div>
          <div>
            <Text type="secondary">
              {t('cdn_status.shed_count', { count: node.shedOnLastHour })}
            </Text>
          </div>
        </StatCard>
      </div>
      <Table
        columns={columns}
        dataSource={rows}
        pagination={false}
        rowKey="key"
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </Card>
  );
};

export const CdnStatusPanel = () => {
  const { t } = useTranslation();
  const statsQuery = useQuery({
    queryKey: serviceStatusKeys.cdnStats(),
    queryFn: () => adminApi.getCdnStats(),
    // 节点每分钟上报一次，刷新得更快也看不到新数据。
    refetchInterval: 60_000,
    retry: false,
  });
  const stats = statsQuery.data;

  return (
    <StatusSection
      empty={!!stats?.available && stats.nodes.length === 0}
      error={statsQuery.isError}
      icon={<CloudServerOutlined />}
      loading={statsQuery.isLoading}
      title={t('cdn_status.title')}
    >
      {stats?.available === false && (
        <Alert showIcon message={t('cdn_status.unavailable')} type="warning" />
      )}
      {stats?.nodes.map((node) => (
        <NodeStats key={node.host} node={node} />
      ))}
    </StatusSection>
  );
};
