import { HistoryOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import { formatBytes, formatCount, formatMs } from './metrics';

const { Text } = Typography;

const RESULT_COLORS: Record<string, string> = {
  diffed: 'green',
  skipped: 'default',
  empty: 'orange',
  failed: 'red',
  retry: 'gold',
};

const distText = (
  dist: WorkerStatsDistribution | null,
  format: (value: number) => string,
) =>
  dist
    ? `${format(dist.avg)} / ${format(dist.p50)} / ${format(dist.p95)} / ${format(dist.max)}`
    : '-';

export const WorkerStatsPanel = () => {
  const { t } = useTranslation();
  const statsQuery = useQuery({
    queryKey: ['workerTaskStats'],
    queryFn: () => adminApi.getWorkerTaskStats(7),
    refetchInterval: 60_000,
    retry: false,
  });

  const days = statsQuery.data?.data ?? [];
  const today = days[0];

  if (statsQuery.isError || (!statsQuery.isLoading && days.length === 0)) {
    return null;
  }

  const columns: ColumnsType<WorkerTaskDaySummary> = [
    { dataIndex: 'date', title: t('worker_stats.col_date'), width: 110 },
    {
      align: 'right',
      dataIndex: 'count',
      render: (value: number) => formatCount(value),
      title: t('worker_stats.col_count'),
      width: 80,
    },
    {
      dataIndex: 'byResult',
      render: (byResult: Record<string, number>) => (
        <Space size={4} wrap>
          {Object.entries(byResult).map(([result, count]) => (
            <Tag color={RESULT_COLORS[result]} key={result}>
              {result} {count}
            </Tag>
          ))}
        </Space>
      ),
      title: t('worker_stats.col_by_result'),
    },
    {
      align: 'right',
      dataIndex: 'durationMs',
      render: (dist: WorkerStatsDistribution | null) =>
        distText(dist, formatMs),
      title: `${t('worker_stats.col_duration')} (avg/p50/p95/max)`,
      width: 260,
    },
    {
      align: 'right',
      dataIndex: 'patchBytes',
      render: (dist: WorkerStatsDistribution | null) =>
        distText(dist, formatBytes),
      title: `${t('worker_stats.col_patch')} (avg/p50/p95/max)`,
      width: 280,
    },
    {
      align: 'right',
      dataIndex: 'artifactBytes',
      render: (dist: WorkerStatsDistribution | null) =>
        distText(dist, formatBytes),
      title: `${t('worker_stats.col_artifact')} (avg/p50/p95/max)`,
      width: 280,
    },
  ];

  return (
    <Card
      className="mt-4"
      loading={statsQuery.isLoading}
      title={
        <Space>
          <HistoryOutlined />
          {t('worker_stats.title')}
        </Space>
      }
    >
      {today && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card size="small">
            <Statistic
              title={t('worker_stats.today_count')}
              value={today.count}
            />
            <Space size={4} wrap>
              {Object.entries(today.byResult).map(([result, count]) => (
                <Tag color={RESULT_COLORS[result]} key={result}>
                  {result} {count}
                </Tag>
              ))}
            </Space>
          </Card>
          <Card size="small">
            <Statistic
              title={`${t('worker_stats.today_duration')} p50 / p95`}
              value={
                today.durationMs
                  ? `${formatMs(today.durationMs.p50)} / ${formatMs(today.durationMs.p95)}`
                  : '-'
              }
            />
            <Text type="secondary">
              avg {today.durationMs ? formatMs(today.durationMs.avg) : '-'} ·
              max {today.durationMs ? formatMs(today.durationMs.max) : '-'}
            </Text>
          </Card>
          <Card size="small">
            <Statistic
              title={`${t('worker_stats.today_patch')} p50 / p95`}
              value={
                today.patchBytes
                  ? `${formatBytes(today.patchBytes.p50)} / ${formatBytes(today.patchBytes.p95)}`
                  : '-'
              }
            />
            <Text type="secondary">
              avg {today.patchBytes ? formatBytes(today.patchBytes.avg) : '-'} ·
              max {today.patchBytes ? formatBytes(today.patchBytes.max) : '-'}
            </Text>
          </Card>
          <Card size="small">
            <Statistic
              title={`${t('worker_stats.today_artifact')} p50 / p95`}
              value={
                today.artifactBytes
                  ? `${formatBytes(today.artifactBytes.p50)} / ${formatBytes(today.artifactBytes.p95)}`
                  : '-'
              }
            />
            <Text type="secondary">
              avg{' '}
              {today.artifactBytes ? formatBytes(today.artifactBytes.avg) : '-'}{' '}
              · max{' '}
              {today.artifactBytes ? formatBytes(today.artifactBytes.max) : '-'}
            </Text>
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
    </Card>
  );
};
