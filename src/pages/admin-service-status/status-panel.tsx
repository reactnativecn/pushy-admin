import { Line } from '@ant-design/charts';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Empty,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  api,
  type InternalApi5xxEvent,
  type InternalMetricsResponse,
} from '@/services/api';
import { adminKeys, metricsKeys } from '@/utils/query-keys';
import { useThemeMode } from '@/utils/theme-mode';
import { InstancesPanel } from './instances-panel';
import {
  API_5XX_EVENT_PAGE_SIZE,
  aggregateDurations,
  buildDurationSeries,
  buildEndpointRows,
  buildRedisSeries,
  buildRequestSeries,
  type EndpointRow,
  estimatePercentile,
  formatBytes,
  formatCount,
  formatMs,
  formatPercent,
  getAverageMs,
  getCounterLabels,
  type SeriesPoint,
  type ServiceStatusTarget,
  sumCounters,
} from './metrics';

const { Paragraph, Text, Title } = Typography;

function createLineConfig(
  data: SeriesPoint[],
  yTitle: string,
  valueFormatter: (value: number) => string = formatCount,
  xTitle?: string,
) {
  return {
    axis: {
      x: {
        labelAutoRotate: true,
        labelFormatter: (value: string) => {
          const parsed = dayjs(value);
          return parsed.isValid() ? parsed.format('HH:mm') : value;
        },
        title: xTitle ?? 'Time',
      },
      y: {
        title: yTitle,
      },
    },
    colorField: 'category',
    data,
    height: 300,
    interaction: {
      legendFilter: true,
      tooltip: { shared: true },
    },
    legend: {
      position: 'top',
    },
    shapeField: 'smooth',
    tooltip: {
      items: [
        (point: SeriesPoint) => ({
          name: point.category,
          value: valueFormatter(point.value),
        }),
      ],
      title: (point: SeriesPoint) => dayjs(point.time).format('MM/DD HH:mm'),
    },
    xField: (datum: SeriesPoint) => new Date(datum.time),
    yField: 'value',
  };
}

function MetricLineCard({
  data,
  title,
  valueFormatter,
  yTitle,
  xTitle,
}: {
  data: SeriesPoint[];
  title: string;
  valueFormatter?: (value: number) => string;
  yTitle: string;
  xTitle?: string;
}) {
  const { isDark } = useThemeMode();
  return (
    <Card title={title}>
      {data.length > 0 ? (
        <Line
          {...createLineConfig(data, yTitle, valueFormatter, xTitle)}
          theme={isDark ? 'classicDark' : 'classic'}
        />
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
    </Card>
  );
}

function getEndpointColumns(
  t: (key: string) => string,
): ColumnsType<EndpointRow> {
  return [
    {
      dataIndex: 'method',
      render: (method: string) => <Tag>{method}</Tag>,
      title: t('admin_service_status.col_method'),
      width: 90,
    },
    {
      dataIndex: 'path',
      render: (path: string) => (
        <Text code className="break-all text-xs">
          {path}
        </Text>
      ),
      title: t('admin_service_status.col_path'),
    },
    {
      align: 'right',
      dataIndex: 'total',
      render: (value: number) => formatCount(value),
      title: t('admin_service_status.col_requests'),
      width: 110,
    },
    {
      align: 'right',
      dataIndex: 'errors',
      render: (value: number) => formatCount(value),
      title: t('admin_service_status.col_5xx'),
      width: 90,
    },
    {
      align: 'right',
      dataIndex: 'errorRate',
      render: (value: number) => formatPercent(value),
      title: t('admin_service_status.col_error_rate'),
      width: 110,
    },
    {
      align: 'right',
      dataIndex: 'avgMs',
      render: (value: number | null) => formatMs(value),
      title: t('admin_service_status.col_avg'),
      width: 100,
    },
    {
      align: 'right',
      dataIndex: 'p95Ms',
      render: (value: number | null) => formatMs(value),
      title: t('admin_service_status.col_p95'),
      width: 100,
    },
  ];
}

function getApi5xxEventColumns(
  t: (key: string) => string,
): ColumnsType<InternalApi5xxEvent> {
  return [
    {
      dataIndex: 'time',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
      title: t('admin_service_status.col_time'),
      width: 180,
    },
    {
      dataIndex: 'statusCode',
      render: (statusCode: number) => <Tag color="red">{statusCode}</Tag>,
      title: t('admin_service_status.col_status'),
      width: 90,
    },
    {
      dataIndex: 'method',
      render: (method: string) => <Tag>{method}</Tag>,
      title: t('admin_service_status.col_method'),
      width: 90,
    },
    {
      dataIndex: 'path',
      render: (value: string) => (
        <Text className="font-mono text-xs" copyable>
          {value}
        </Text>
      ),
      title: t('admin_service_status.col_path'),
      width: 260,
    },
    {
      align: 'right',
      dataIndex: 'durationMs',
      render: (value: number) => formatMs(value),
      title: t('admin_service_status.col_duration'),
      width: 100,
    },
    {
      dataIndex: 'requestId',
      render: (value: string | undefined) =>
        value ? (
          <Text className="font-mono text-xs" copyable>
            {value}
          </Text>
        ) : (
          '-'
        ),
      title: t('admin_service_status.col_request_id'),
      width: 180,
    },
    {
      dataIndex: 'message',
      render: (_: string | undefined, entry) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            {entry.errorCode && <Tag>{entry.errorCode}</Tag>}
            {entry.errorName && <Tag>{entry.errorName}</Tag>}
            <Tag>PID {entry.pid}</Tag>
          </div>
          <Paragraph className="m-0! whitespace-pre-wrap break-all text-xs">
            {entry.message || '-'}
          </Paragraph>
        </div>
      ),
      title: t('admin_service_status.col_error'),
    },
  ];
}

export function ServiceStatusPanel({
  error,
  isFetching,
  refetch,
  snapshot,
  target,
}: {
  error: unknown;
  isFetching: boolean;
  refetch: () => unknown;
  snapshot?: InternalMetricsResponse;
  target: ServiceStatusTarget;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const counterLabels = getCounterLabels(t);
  const [api5xxEventPage, setApi5xxEventPage] = useState(1);
  const api5xxEventOffset = (api5xxEventPage - 1) * API_5XX_EVENT_PAGE_SIZE;
  const api5xxEventsQuery = useQuery({
    queryFn: () =>
      api.getInternalApi5xxEvents({
        baseUrl: target.baseUrl,
        limit: API_5XX_EVENT_PAGE_SIZE,
        offset: api5xxEventOffset,
        suppressErrorToast: true,
      }),
    queryKey: metricsKeys.internalApi5xxEvents(target.key, api5xxEventOffset),
    refetchInterval: 30_000,
  });
  const apiDuration = useMemo(
    () =>
      aggregateDurations(
        snapshot?.durations,
        snapshot?.config,
        (entry) => entry.name === 'api.request.duration',
      ),
    [snapshot],
  );
  const requestSeries = useMemo(
    () => buildRequestSeries(snapshot, counterLabels),
    [snapshot, counterLabels],
  );
  const durationSeries = useMemo(
    () => buildDurationSeries(snapshot),
    [snapshot],
  );
  const redisSeries = useMemo(
    () => buildRedisSeries(snapshot, counterLabels),
    [snapshot, counterLabels],
  );
  const endpointRows = useMemo(() => buildEndpointRows(snapshot), [snapshot]);

  const totalRequests = sumCounters(snapshot?.counters, 'api.request.total');
  const totalErrors = sumCounters(snapshot?.counters, 'api.request.error');
  const l1Hits = sumCounters(snapshot?.counters, 'cache.l1.hit');
  const redisHits = sumCounters(snapshot?.counters, 'cache.redis.hit');
  const staleHits = sumCounters(snapshot?.counters, 'cache.stale.hit');
  const handlerMisses = sumCounters(snapshot?.counters, 'cache.handler.miss');
  const redisFallbacks = sumCounters(
    snapshot?.counters,
    'redis.operation.fallback',
  );
  const redisShortCircuits = sumCounters(
    snapshot?.counters,
    'redis.operation.short_circuit',
  );
  const redisCircuitOpens = sumCounters(
    snapshot?.counters,
    'redis.circuit.open',
  );
  const cacheServed = l1Hits + redisHits + staleHits;
  const cacheTotal = cacheServed + handlerMisses;
  const cacheHitRate = cacheTotal > 0 ? cacheServed / cacheTotal : 0;
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={5} className="m-0!">
            {target.label}
          </Title>
          <div className="mt-1 flex flex-wrap gap-2">
            <Tag>{target.host}</Tag>
            {snapshot?.generatedAt && (
              <Tag>
                {dayjs(snapshot.generatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Tag>
            )}
            {snapshot?.process.pid && <Tag>PID {snapshot.process.pid}</Tag>}
          </div>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={isFetching || api5xxEventsQuery.isFetching}
          onClick={() => {
            refetch();
            api5xxEventsQuery.refetch();
            queryClient.invalidateQueries({
              queryKey: adminKeys.systemInstances(target.key),
            });
            queryClient.invalidateQueries({
              queryKey: adminKeys.systemNpm(target.key),
            });
          }}
        >
          {t('admin_service_status.refresh')}
        </Button>
      </div>

      {error && (
        <Card className="mb-4">
          <Text type="danger">
            {(error as Error).message ||
              t('admin_service_status.request_failed')}
          </Text>
        </Card>
      )}

      <InstancesPanel target={target} />

      <Spin spinning={isFetching && !snapshot}>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <Statistic
              title={t('admin_service_status.api_requests')}
              value={formatCount(totalRequests)}
            />
            <Text type={totalErrors > 0 ? 'danger' : 'secondary'}>
              5xx {formatCount(totalErrors)} /{' '}
              {formatPercent(totalErrors / totalRequests)}
            </Text>
          </Card>
          <Card>
            <Statistic
              title={t('admin_service_status.api_latency')}
              value={formatMs(getAverageMs(apiDuration))}
            />
            <Text type="secondary">
              p95{' '}
              {formatMs(
                estimatePercentile(apiDuration, snapshot?.config, 0.95),
              )}
            </Text>
          </Card>
          <Card>
            <Statistic
              title={t('admin_service_status.cache_hit')}
              value={formatPercent(cacheHitRate)}
            />
            <Text type="secondary">
              L1 {formatCount(l1Hits)} / Redis {formatCount(redisHits)} / Stale{' '}
              {formatCount(staleHits)}
            </Text>
          </Card>
          <Card>
            <Statistic
              title={t('admin_service_status.redis_degrade')}
              value={formatCount(redisFallbacks + redisShortCircuits)}
            />
            <Text type={redisCircuitOpens > 0 ? 'warning' : 'secondary'}>
              fallback {formatCount(redisFallbacks)} / short{' '}
              {formatCount(redisShortCircuits)} / open{' '}
              {formatCount(redisCircuitOpens)}
            </Text>
          </Card>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <MetricLineCard
            data={requestSeries}
            title={t('admin_service_status.chart_api_requests')}
            yTitle={t('admin_service_status.y_requests')}
            xTitle={t('admin_service_status.col_time')}
          />
          <MetricLineCard
            data={durationSeries}
            title={t('admin_service_status.chart_api_latency')}
            valueFormatter={formatMs}
            yTitle={t('admin_service_status.y_milliseconds')}
            xTitle={t('admin_service_status.col_time')}
          />
          <MetricLineCard
            data={redisSeries}
            title={t('admin_service_status.chart_redis_cache')}
            yTitle={t('admin_service_status.y_count')}
            xTitle={t('admin_service_status.col_time')}
          />
        </div>

        <Card className="mb-4" title={t('admin_service_status.top_api_paths')}>
          <Table
            columns={getEndpointColumns(t)}
            dataSource={endpointRows.slice(0, 12)}
            pagination={false}
            rowKey="key"
            scroll={{ x: 760 }}
            size="small"
          />
        </Card>

        <Card
          className="mb-4"
          extra={
            api5xxEventsQuery.data ? (
              <Text type="secondary">
                {t('admin_service_status.info_recent')}{' '}
                {formatCount(api5xxEventsQuery.data.total)} /{' '}
                {t('admin_service_status.info_capacity')}{' '}
                {formatCount(api5xxEventsQuery.data.capacity)}
                {api5xxEventsQuery.data.log ? (
                  <>
                    {' '}
                    / {t('admin_service_status.info_filtered')}{' '}
                    {formatCount(api5xxEventsQuery.data.log.ignored)} /{' '}
                    {t('admin_service_status.info_log_window')}{' '}
                    {formatBytes(api5xxEventsQuery.data.log.readBytes)}
                  </>
                ) : null}
              </Text>
            ) : null
          }
          title={t('admin_service_status.events_5xx')}
        >
          {api5xxEventsQuery.error && (
            <div className="mb-3">
              <Text type="danger">
                {(api5xxEventsQuery.error as Error).message ||
                  t('admin_service_status.request_failed')}
              </Text>
            </div>
          )}
          <Table
            columns={getApi5xxEventColumns(t)}
            dataSource={api5xxEventsQuery.data?.data ?? []}
            loading={api5xxEventsQuery.isFetching}
            locale={{
              emptyText: api5xxEventsQuery.error
                ? t('admin_service_status.request_failed')
                : t('admin_service_status.no_5xx_events'),
            }}
            pagination={{
              current: api5xxEventPage,
              hideOnSinglePage: false,
              onChange: setApi5xxEventPage,
              pageSize: API_5XX_EVENT_PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (total) =>
                t('admin_service_status.events_count', {
                  count: formatCount(total),
                }),
              total: api5xxEventsQuery.data?.total ?? 0,
            }}
            rowKey="id"
            scroll={{ x: 1100 }}
            size="small"
          />
        </Card>
      </Spin>
    </>
  );
}
