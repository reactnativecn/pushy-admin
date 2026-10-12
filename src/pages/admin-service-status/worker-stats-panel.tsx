import { HistoryOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import { formatBytes, formatCount } from '@/utils/format';
import { serviceStatusKeys } from '@/utils/query-keys';
import { formatMs } from './metrics';
import { StatCard, StatusSection } from './status-section';

const { Text } = Typography;

const RESULT_COLORS: Record<string, string> = {
  diffed: 'green',
  skipped: 'default',
  empty: 'orange',
  failed: 'volcano',
  retry: 'gold',
};

const FAILURE_COLORS: Record<string, string> = {
  target_missing: 'gold',
  transient_dependency: 'gold',
  timeout: 'gold',
  archive_compression_ratio: 'orange',
  archive_entry_bytes: 'orange',
  archive_declared_bytes: 'orange',
  archive_total_bytes: 'orange',
  archive_output_bytes: 'orange',
  source_missing: 'default',
  source_and_target_missing: 'default',
};

const distText = (
  dist: WorkerStatsDistribution | null,
  format: (value: number) => string,
) =>
  dist
    ? `${format(dist.avg)} / ${format(dist.p50)} / ${format(dist.p95)} / ${format(dist.max)}`
    : '-';

/** 今日分布卡片：主值 p50 / p95，说明行 avg · max */
const DistributionStatCard = ({
  dist,
  format,
  title,
}: {
  dist: WorkerStatsDistribution | null;
  format: (value: number) => string;
  title: string;
}) => (
  <StatCard
    detail={`avg ${dist ? format(dist.avg) : '-'} · max ${dist ? format(dist.max) : '-'}`}
    title={`${title} p50 / p95`}
    value={dist ? `${format(dist.p50)} / ${format(dist.p95)}` : '-'}
  />
);

export const WorkerStatsPanel = () => {
  const { t } = useTranslation();
  const statsQuery = useQuery({
    queryKey: serviceStatusKeys.workerTaskStats(7),
    queryFn: () => adminApi.getWorkerTaskStats(7),
    refetchInterval: 60_000,
    retry: false,
  });

  const days = statsQuery.data?.data ?? [];
  const today = days[0];

  const resultTags = (distribution: Record<string, number>) => (
    <Space size={4} wrap>
      {Object.entries(distribution)
        .sort((left, right) => right[1] - left[1])
        .map(([result, count]) => (
          <Tag color={RESULT_COLORS[result]} key={result}>
            {t(`worker_stats.result_${result}`, { defaultValue: result })}{' '}
            {count}
          </Tag>
        ))}
    </Space>
  );

  const failureTags = (distribution?: Record<string, number>) => {
    if (!distribution || Object.keys(distribution).length === 0) {
      return '-';
    }
    return (
      <Space size={4} wrap>
        {Object.entries(distribution)
          .sort((left, right) => right[1] - left[1])
          .map(([failure, count]) => (
            <Tag color={FAILURE_COLORS[failure] ?? 'default'} key={failure}>
              {t(`worker_stats.failure_${failure}`, {
                defaultValue: failure,
              })}{' '}
              {count}
            </Tag>
          ))}
      </Space>
    );
  };

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
      render: resultTags,
      title: t('worker_stats.col_by_result'),
    },
    {
      dataIndex: 'byFailure',
      render: failureTags,
      title: t('worker_stats.col_by_failure'),
      width: 300,
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
    <StatusSection
      empty={days.length === 0}
      error={statsQuery.isError}
      icon={<HistoryOutlined />}
      loading={statsQuery.isLoading}
      title={t('worker_stats.title')}
    >
      {today && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title={t('worker_stats.today_count')} value={today.count}>
            {resultTags(today.byResult)}
          </StatCard>
          <DistributionStatCard
            dist={today.durationMs}
            format={formatMs}
            title={t('worker_stats.today_duration')}
          />
          <DistributionStatCard
            dist={today.patchBytes}
            format={formatBytes}
            title={t('worker_stats.today_patch')}
          />
          <DistributionStatCard
            dist={today.artifactBytes}
            format={formatBytes}
            title={t('worker_stats.today_artifact')}
          />
        </div>
      )}
      {today && Object.keys(today.byFailure ?? {}).length > 0 && (
        <div className="mb-4">
          <Text className="mr-2" type="secondary">
            {t('worker_stats.today_failures')}
          </Text>
          {failureTags(today.byFailure)}
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
