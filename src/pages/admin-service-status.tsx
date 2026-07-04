import { Line } from '@ant-design/charts';
import { ReloadOutlined } from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Empty,
  Progress,
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
  type InternalMetricCounter,
  type InternalMetricDuration,
  type InternalMetricsResponse,
} from '@/services/api';
import { cn } from '@/utils/helper';
import { metricsKeys } from '@/utils/query-keys';

const { Paragraph, Text, Title } = Typography;

const API_5XX_EVENT_PAGE_SIZE = 20;
const DEFAULT_DURATION_BUCKETS_MS = [
  10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000,
];

type SeriesPoint = {
  category: string;
  time: string;
  value: number;
};

type DurationAggregate = {
  buckets: Record<string, number>;
  count: number;
  maxMs: number;
  minMs: number;
  totalMs: number;
};

type EndpointRow = {
  avgMs: number | null;
  errorRate: number;
  errors: number;
  key: string;
  method: string;
  p95Ms: number | null;
  path: string;
  total: number;
};

type ServiceStatusSummary = {
  delayText: string;
  hitText: string;
  requestText: string;
};

const SERVICE_STATUS_TARGETS = [
  {
    key: 'jd1',
    label: 'jd1',
    host: '1.rnupdate.online',
    baseUrl: 'https://1.rnupdate.online/api',
  },
  {
    key: 'jd2',
    label: 'jd2',
    host: '2.rnupdate.online',
    baseUrl: 'https://2.rnupdate.online/api',
  },
  {
    key: 'jd3',
    label: 'jd3',
    host: '3.rnupdate.online',
    baseUrl: 'https://3.rnupdate.online/api',
  },
  {
    key: 'jd4',
    label: 'jd4',
    host: '4.rnupdate.online',
    baseUrl: 'https://4.rnupdate.online/api',
  },
  {
    key: 's1',
    label: 's1',
    host: 's1.reactnative.cn',
    baseUrl: 'https://s1.reactnative.cn/api',
  },
  {
    key: 'p',
    label: 'p',
    host: 'p.reactnative.cn',
    baseUrl: 'https://p.reactnative.cn/api',
  },
] as const;

type ServiceStatusTarget = (typeof SERVICE_STATUS_TARGETS)[number];
type ServiceStatusTargetKey = ServiceStatusTarget['key'];

function getCounterLabels(t: (key: string) => string): Record<string, string> {
  return {
    'api.request.error': t('admin_service_status.counter_5xx'),
    'api.request.total': t('admin_service_status.counter_requests'),
    'cache.l1.hit': t('admin_service_status.counter_l1_hit'),
    'cache.redis.hit': t('admin_service_status.counter_redis_hit'),
    'cache.stale.hit': t('admin_service_status.counter_stale_hit'),
    'redis.circuit.open': t('admin_service_status.counter_circuit_open'),
    'redis.operation.fallback': t(
      'admin_service_status.counter_redis_fallback',
    ),
    'redis.operation.short_circuit': t(
      'admin_service_status.counter_short_circuit',
    ),
  };
}

function getDurationBucketMs(config?: InternalMetricsResponse['config']) {
  return config?.durationBucketsMs?.length
    ? config.durationBucketsMs
    : DEFAULT_DURATION_BUCKETS_MS;
}

function getDurationBucketLabels(config?: InternalMetricsResponse['config']) {
  return [...getDurationBucketMs(config).map((value) => `<=${value}`), '+Inf'];
}

function createDurationAggregate(
  config?: InternalMetricsResponse['config'],
): DurationAggregate {
  return {
    buckets: Object.fromEntries(
      getDurationBucketLabels(config).map((label) => [label, 0]),
    ),
    count: 0,
    maxMs: 0,
    minMs: Number.POSITIVE_INFINITY,
    totalMs: 0,
  };
}

function addDurationEntry(
  aggregate: DurationAggregate,
  entry: InternalMetricDuration,
) {
  aggregate.count += entry.count;
  aggregate.totalMs += entry.totalMs;
  aggregate.maxMs = Math.max(aggregate.maxMs, entry.maxMs);
  if (entry.count > 0) {
    aggregate.minMs = Math.min(aggregate.minMs, entry.minMs);
  }
  for (const [bucket, count] of Object.entries(entry.buckets)) {
    aggregate.buckets[bucket] = (aggregate.buckets[bucket] ?? 0) + count;
  }
}

function aggregateDurations(
  durations: InternalMetricDuration[] = [],
  config?: InternalMetricsResponse['config'],
  predicate: (entry: InternalMetricDuration) => boolean = () => true,
) {
  const aggregate = createDurationAggregate(config);
  for (const entry of durations) {
    if (predicate(entry)) {
      addDurationEntry(aggregate, entry);
    }
  }
  return aggregate;
}

function estimatePercentile(
  aggregate: DurationAggregate,
  config: InternalMetricsResponse['config'] | undefined,
  percentile: number,
) {
  if (aggregate.count <= 0) {
    return null;
  }
  const target = Math.ceil(aggregate.count * percentile);
  let seen = 0;
  for (const bucketMs of getDurationBucketMs(config)) {
    seen += aggregate.buckets[`<=${bucketMs}`] ?? 0;
    if (seen >= target) {
      return bucketMs;
    }
  }
  seen += aggregate.buckets['+Inf'] ?? 0;
  return seen >= target ? Number.POSITIVE_INFINITY : null;
}

function sumCounters(
  counters: InternalMetricCounter[] = [],
  name: string,
  predicate: (entry: InternalMetricCounter) => boolean = () => true,
) {
  return counters.reduce((total, entry) => {
    if (entry.name !== name || !predicate(entry)) {
      return total;
    }
    return total + entry.value;
  }, 0);
}

function formatBytes(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  const mb = (value as number) / 1024 / 1024;
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function formatCount(value: number | undefined) {
  return Number.isFinite(value) ? (value as number).toLocaleString() : '-';
}

function formatMs(value: number | null | undefined) {
  if (value === Number.POSITIVE_INFINITY) {
    return `>${DEFAULT_DURATION_BUCKETS_MS.at(-1)! / 1000}s`;
  }
  if (!Number.isFinite(value)) {
    return '-';
  }
  if ((value as number) >= 1000) {
    return `${((value as number) / 1000).toFixed(2)}s`;
  }
  return `${(value as number).toFixed(0)}ms`;
}

function formatPercent(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return `${((value as number) * 100).toFixed(2)}%`;
}

function formatUptime(seconds: number | undefined) {
  if (!Number.isFinite(seconds)) {
    return '-';
  }
  const totalSeconds = Math.floor(seconds as number);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getAverageMs(aggregate: DurationAggregate) {
  return aggregate.count > 0 ? aggregate.totalMs / aggregate.count : null;
}

function buildRequestSeries(
  snapshot: InternalMetricsResponse | undefined,
  counterLabels: Record<string, string>,
): SeriesPoint[] {
  return (snapshot?.buckets ?? []).flatMap((bucket) => [
    {
      category: counterLabels['api.request.total'],
      time: bucket.start,
      value: sumCounters(bucket.counters, 'api.request.total'),
    },
    {
      category: counterLabels['api.request.error'],
      time: bucket.start,
      value: sumCounters(bucket.counters, 'api.request.error'),
    },
  ]);
}

function buildDurationSeries(
  snapshot?: InternalMetricsResponse,
): SeriesPoint[] {
  return (snapshot?.buckets ?? []).flatMap((bucket) => {
    const aggregate = aggregateDurations(
      bucket.durations,
      snapshot?.config,
      (entry) => entry.name === 'api.request.duration',
    );
    if (aggregate.count === 0) {
      return [];
    }
    return [
      {
        category: 'avg',
        time: bucket.start,
        value: getAverageMs(aggregate) ?? 0,
      },
      {
        category: 'p95',
        time: bucket.start,
        value: estimatePercentile(aggregate, snapshot?.config, 0.95) ?? 0,
      },
    ];
  });
}

function buildRedisSeries(
  snapshot: InternalMetricsResponse | undefined,
  counterLabels: Record<string, string>,
): SeriesPoint[] {
  const names = [
    'redis.operation.fallback',
    'redis.operation.short_circuit',
    'redis.circuit.open',
    'cache.stale.hit',
    'cache.redis.hit',
  ];
  return (snapshot?.buckets ?? []).flatMap((bucket) =>
    names.map((name) => ({
      category: counterLabels[name] ?? name,
      time: bucket.start,
      value: sumCounters(bucket.counters, name),
    })),
  );
}

function buildEndpointRows(snapshot?: InternalMetricsResponse): EndpointRow[] {
  const totals = new Map<string, EndpointRow>();
  const durationEntries = new Map<string, InternalMetricDuration[]>();

  for (const counter of snapshot?.counters ?? []) {
    if (counter.name !== 'api.request.total') {
      continue;
    }
    const method = counter.labels.method || 'UNKNOWN';
    const path = counter.labels.path || 'unknown';
    const key = `${method} ${path}`;
    const row = totals.get(key) ?? {
      avgMs: null,
      errorRate: 0,
      errors: 0,
      key,
      method,
      p95Ms: null,
      path,
      total: 0,
    };
    row.total += counter.value;
    totals.set(key, row);
  }

  for (const counter of snapshot?.counters ?? []) {
    if (counter.name !== 'api.request.error') {
      continue;
    }
    const method = counter.labels.method || 'UNKNOWN';
    const path = counter.labels.path || 'unknown';
    const key = `${method} ${path}`;
    const row = totals.get(key);
    if (row) {
      row.errors += counter.value;
    }
  }

  for (const duration of snapshot?.durations ?? []) {
    if (duration.name !== 'api.request.duration') {
      continue;
    }
    const method = duration.labels.method || 'UNKNOWN';
    const path = duration.labels.path || 'unknown';
    const key = `${method} ${path}`;
    const entries = durationEntries.get(key) ?? [];
    entries.push(duration);
    durationEntries.set(key, entries);
  }

  for (const [key, row] of totals) {
    const aggregate = aggregateDurations(
      durationEntries.get(key),
      snapshot?.config,
    );
    row.errorRate = row.total > 0 ? row.errors / row.total : 0;
    row.avgMs = getAverageMs(aggregate);
    row.p95Ms = estimatePercentile(aggregate, snapshot?.config, 0.95);
  }

  return [...totals.values()].sort((left, right) => right.total - left.total);
}

function buildServiceStatusSummary(
  snapshot?: InternalMetricsResponse,
): ServiceStatusSummary {
  if (!snapshot) {
    return {
      delayText: '-',
      hitText: '-',
      requestText: '-',
    };
  }

  const totalRequests = sumCounters(snapshot.counters, 'api.request.total');
  const totalErrors = sumCounters(snapshot.counters, 'api.request.error');
  const apiDuration = aggregateDurations(
    snapshot.durations,
    snapshot.config,
    (entry) => entry.name === 'api.request.duration',
  );
  const l1Hits = sumCounters(snapshot.counters, 'cache.l1.hit');
  const redisHits = sumCounters(snapshot.counters, 'cache.redis.hit');
  const staleHits = sumCounters(snapshot.counters, 'cache.stale.hit');
  const handlerMisses = sumCounters(snapshot.counters, 'cache.handler.miss');
  const cacheServed = l1Hits + redisHits + staleHits;
  const cacheTotal = cacheServed + handlerMisses;
  const cacheHitRate = cacheTotal > 0 ? cacheServed / cacheTotal : 0;

  return {
    delayText: formatMs(getAverageMs(apiDuration)),
    hitText: formatPercent(cacheHitRate),
    requestText: `${formatCount(totalRequests)}/${formatCount(totalErrors)}`,
  };
}

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
  return (
    <Card title={title}>
      {data.length > 0 ? (
        <Line {...createLineConfig(data, yTitle, valueFormatter, xTitle)} />
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

function ServiceStatusPanel({
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
  const heapPercent =
    snapshot?.process.memory.heapTotal && snapshot.process.memory.heapTotal > 0
      ? snapshot.process.memory.heapUsed / snapshot.process.memory.heapTotal
      : 0;

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

      <Spin spinning={isFetching && !snapshot}>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <Statistic
              title={t('admin_service_status.uptime')}
              value={formatUptime(snapshot?.process.uptimeSeconds)}
            />
          </Card>
          <Card>
            <Statistic
              title={t('admin_service_status.rss')}
              value={formatBytes(snapshot?.process.memory.rss)}
            />
          </Card>
          <Card>
            <Statistic
              title={t('admin_service_status.heap')}
              value={formatBytes(snapshot?.process.memory.heapUsed)}
            />
            <Progress
              percent={Number((heapPercent * 100).toFixed(1))}
              showInfo={false}
              size="small"
            />
          </Card>
          <Card>
            <Statistic
              title={t('admin_service_status.external')}
              value={formatBytes(snapshot?.process.memory.external)}
            />
          </Card>
        </div>

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

function ServiceTargetSidebar({
  activeKey,
  items,
  onChange,
}: {
  activeKey: ServiceStatusTargetKey;
  items: Array<{
    hasData: boolean;
    isError: boolean;
    isFetching: boolean;
    summary: ServiceStatusSummary;
    target: ServiceStatusTarget;
  }>;
  onChange: (key: ServiceStatusTargetKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <aside className="min-w-0">
      <div className="space-y-2 lg:sticky lg:top-6">
        {items.map(({ hasData, isError, isFetching, summary, target }) => {
          const isActive = target.key === activeKey;
          const statusTitle = isError
            ? t('admin_service_status.sidebar_failed')
            : isFetching && !hasData
              ? t('admin_service_status.sidebar_loading')
              : t('admin_service_status.sidebar_healthy');

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                'w-full cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md',
                isActive
                  ? 'border-primary bg-blue-50 shadow-none'
                  : 'border-slate-200',
              )}
              key={target.key}
              onClick={() => onChange(target.key)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'shrink-0 font-semibold text-base',
                    isActive ? 'text-primary' : 'text-slate-900',
                  )}
                >
                  {target.label}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-slate-500 text-xs"
                  title={target.host}
                >
                  {target.host}
                </span>
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    isError
                      ? 'bg-red-500'
                      : isFetching && !hasData
                        ? 'bg-blue-400'
                        : 'bg-emerald-500',
                  )}
                  title={statusTitle}
                />
              </span>
              <span className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <span className="min-w-0">
                  <span className="block text-slate-400">
                    {t('admin_service_status.sidebar_req_err')}
                  </span>
                  <span className="block truncate font-medium text-slate-700 tabular-nums">
                    {summary.requestText}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-slate-400">
                    {t('admin_service_status.sidebar_latency')}
                  </span>
                  <span className="block truncate font-medium text-slate-700 tabular-nums">
                    {summary.delayText}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-slate-400">
                    {t('admin_service_status.sidebar_hit')}
                  </span>
                  <span className="block truncate font-medium text-slate-700 tabular-nums">
                    {summary.hitText}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export const Component = () => {
  const [activeTargetKey, setActiveTargetKey] =
    useState<ServiceStatusTargetKey>(SERVICE_STATUS_TARGETS[0].key);
  const { t } = useTranslation();
  const targetQueries = useQueries({
    queries: SERVICE_STATUS_TARGETS.map((target) => ({
      queryFn: () =>
        api.getInternalMetrics({
          baseUrl: target.baseUrl,
          suppressErrorToast: true,
        }),
      queryKey: metricsKeys.internal(target.key),
      refetchInterval: 30_000,
    })),
  });
  const activeTargetIndex = Math.max(
    SERVICE_STATUS_TARGETS.findIndex(
      (target) => target.key === activeTargetKey,
    ),
    0,
  );
  const activeTarget = SERVICE_STATUS_TARGETS[activeTargetIndex];
  const activeQuery = targetQueries[activeTargetIndex];
  const targetItems = SERVICE_STATUS_TARGETS.map((target, index) => {
    const query = targetQueries[index];
    return {
      hasData: Boolean(query?.data),
      isError: Boolean(query?.error),
      isFetching: query?.isFetching ?? false,
      summary: buildServiceStatusSummary(query?.data),
      target,
    };
  });

  return (
    <div className="page-section">
      <div className="mb-4">
        <Title level={4} className="m-0!">
          {t('admin_service_status.title')}
        </Title>
        <Text type="secondary">{t('admin_service_status.description')}</Text>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ServiceTargetSidebar
          activeKey={activeTarget.key}
          items={targetItems}
          onChange={setActiveTargetKey}
        />
        <div className="min-w-0">
          <ServiceStatusPanel
            error={activeQuery?.error}
            isFetching={activeQuery?.isFetching ?? false}
            key={activeTarget.key}
            refetch={() => activeQuery?.refetch()}
            snapshot={activeQuery?.data}
            target={activeTarget}
          />
        </div>
      </div>
    </div>
  );
};
