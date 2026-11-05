import { CloudServerOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Progress,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminApi,
  type CdnNodeStats,
  type CdnStatsWindow,
  type CdnWindowName,
} from '@/services/admin-api';
import { formatBytes, formatCount, formatPercent } from '@/utils/format';
import { serviceStatusKeys } from '@/utils/query-keys';
import {
  averageDownloadMs,
  averageMbps,
  CDN_WINDOWS,
  cdnWindowConfig,
  certDaysLeft,
  coverageShortfall,
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
// 切走的时段留一会儿，切回来不用重新请求。
const WINDOW_CACHE_MS = 30 * 60_000;

const UnreachableNode = ({ host }: { host: string }) => {
  const { t } = useTranslation();
  return (
    <Alert
      className="mb-4 last:mb-0"
      showIcon
      message={t('cdn_status.unreachable', { host })}
      type="error"
    />
  );
};

const WindowStats = ({
  seconds,
  window,
}: {
  seconds?: number;
  window: CdnStatsWindow;
}) => {
  const { t } = useTranslation();
  const coverage = coverageShortfall(window.coveredSeconds, seconds);
  const count = (dataIndex: keyof CdnStatsWindow, title: string) => ({
    align: 'right' as const,
    dataIndex,
    render: (value: number) => formatCount(value),
    title,
  });
  const columns: ColumnsType<CdnStatsWindow> = [
    count('requests', t('cdn_status.col_requests')),
    count('getRequests', t('cdn_status.col_get')),
    count('headRequests', t('cdn_status.col_head')),
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
      dataIndex: 'hitBytes',
      render: (value: number) => formatBytes(value),
      title: t('cdn_status.hit_bytes'),
    },
    {
      align: 'right',
      key: 'duration',
      render: (_, row) =>
        formatLatency(averageDownloadMs(row.downloadTimeMsSum, row.downloads)),
      title: t('cdn_status.col_duration'),
    },
    {
      align: 'right',
      key: 'median',
      render: (_, row) =>
        formatLatency(row.downloads > 0 ? row.medianDownloadMs : null),
      title: t('cdn_status.col_median'),
    },
    count('status2xx', '2xx'),
    count('status3xx', t('cdn_status.col_shed')),
    count('status4xx', '4xx'),
    count('status5xx', '5xx'),
  ];

  return (
    <>
      {coverage && (
        <Alert
          className="mb-4"
          showIcon
          message={t(`cdn_status.coverage_${coverage.unit}`, {
            value: coverage.value,
          })}
          type="info"
        />
      )}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('cdn_status.col_average')}
          value={formatMbps(averageMbps(window.txBytes, window.coveredSeconds))}
        />
        <StatCard
          title={t('cdn_status.col_peak')}
          value={formatMbps(window.peakTxMbps)}
        />
        <StatCard
          title={t('cdn_status.col_tx')}
          value={formatBytes(window.txBytes)}
        />
        <StatCard
          title={t('cdn_status.col_rx')}
          value={formatBytes(window.rxBytes)}
        />
      </div>
      <Table
        columns={columns}
        dataSource={[window]}
        pagination={false}
        rowKey={() => 'window'}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </>
  );
};

const NodeStats = ({
  children,
  node,
}: {
  children: React.ReactNode;
  node: CdnNodeStats;
}) => {
  const { t } = useTranslation();
  const { last5m, last24h } = node.windows;
  const diskRatio = usageRatio(node.cacheUsedBytes, node.cacheTotalBytes);
  const certDays = certDaysLeft(node.certNotAfter, Date.now());
  const diskLevel = usageLevel(diskRatio);
  // 节点还没升级时没有这些字段，整张卡片不显示。
  const memoryUsed = node.memoryTotalBytes - node.memoryAvailableBytes;
  const memoryRatio = usageRatio(memoryUsed, node.memoryTotalBytes);

  return (
    <Card
      className="mb-4 last:mb-0"
      size="small"
      title={
        <Space size={4} wrap>
          <Text code>{node.host}</Text>
          <Tag color="success">
            {t('cdn_status.updated_at', {
              time: dayjs.unix(node.generatedAt).format('HH:mm:ss'),
            })}
          </Tag>
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
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          detail={t('cdn_status.bandwidth_detail', {
            connections: formatCount(node.activeConnections),
            peak: formatMbps(last24h.peakTxMbps),
          })}
          title={t('cdn_status.bandwidth')}
          value={formatMbps(averageMbps(last5m.txBytes, last5m.coveredSeconds))}
        />
        {node.memoryTotalBytes > 0 && (
          <StatCard
            detail={t('cdn_status.load_detail', {
              cores: node.cpuCount,
              load1: node.load1.toFixed(2),
              load5: node.load5.toFixed(2),
              load15: node.load15.toFixed(2),
            })}
            title={t('cdn_status.cpu')}
            value={formatPercent(node.cpuPercent / 100)}
          >
            <div>
              <Text type="secondary">
                {t('cdn_status.memory', {
                  total: formatBytes(node.memoryTotalBytes),
                  used: formatBytes(memoryUsed),
                })}
              </Text>
            </div>
            {memoryRatio != null && (
              <Progress
                percent={Math.min(100, Number((memoryRatio * 100).toFixed(1)))}
                size="small"
                status={
                  usageLevel(memoryRatio) === 'danger' ? 'exception' : 'normal'
                }
              />
            )}
          </StatCard>
        )}
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
      {children}
    </Card>
  );
};

export const CdnStatusPanel = () => {
  const { t } = useTranslation();
  const [activeWindow, setActiveWindow] = useState<CdnWindowName>('last1h');
  const windowConfig = cdnWindowConfig(activeWindow);

  const statsQuery = useQuery({
    queryKey: serviceStatusKeys.cdnStats(),
    queryFn: () => adminApi.getCdnStats(),
    // 节点每分钟汇总一次，刷新得更快也看不到新数据。
    refetchInterval: 60_000,
    retry: false,
  });
  // 只请求当前 Tab 的时段；隐藏卡片时没有节点，也就不用查。
  const stats = statsQuery.data;
  const hasNodes = (stats?.nodes.length ?? 0) > 0;
  const windowQuery = useQuery({
    enabled: hasNodes,
    gcTime: WINDOW_CACHE_MS,
    queryKey: serviceStatusKeys.cdnWindow(activeWindow),
    queryFn: () => adminApi.getCdnWindow(activeWindow),
    refetchInterval: windowConfig.refreshMs,
    retry: false,
    staleTime: windowConfig.refreshMs,
  });

  const renderWindow = (host: string) => {
    if (windowQuery.isLoading) {
      return (
        <div className="py-8 text-center">
          <Spin />
        </div>
      );
    }
    const node = windowQuery.data?.nodes.find((item) => item.host === host);
    // 旧版服务端忽略 window 参数，返回的节点没有 window 字段。
    if (!node?.window || node.error) {
      return (
        <Alert
          showIcon
          message={t('cdn_status.window_failed')}
          type="warning"
        />
      );
    }
    return <WindowStats seconds={windowConfig.seconds} window={node.window} />;
  };

  return (
    <StatusSection
      empty={stats?.nodes.length === 0}
      error={statsQuery.isError}
      icon={<CloudServerOutlined />}
      loading={statsQuery.isLoading}
      title={t('cdn_status.title')}
    >
      {stats?.nodes.map((node) =>
        node.error ? (
          <UnreachableNode host={node.host} key={node.host} />
        ) : (
          <NodeStats key={node.host} node={node}>
            <Tabs
              activeKey={activeWindow}
              items={CDN_WINDOWS.map((window) => ({
                key: window.key,
                label: t(window.labelKey),
              }))}
              onChange={(key) => setActiveWindow(key as CdnWindowName)}
            />
            {renderWindow(node.host)}
          </NodeStats>
        ),
      )}
    </StatusSection>
  );
};
