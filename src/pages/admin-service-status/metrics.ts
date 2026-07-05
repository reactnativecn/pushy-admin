import type {
  InternalMetricCounter,
  InternalMetricDuration,
  InternalMetricsResponse,
} from '@/services/api';

export const API_5XX_EVENT_PAGE_SIZE = 20;
export const DEFAULT_DURATION_BUCKETS_MS = [
  10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000,
];

export type SeriesPoint = {
  category: string;
  time: string;
  value: number;
};

export type DurationAggregate = {
  buckets: Record<string, number>;
  count: number;
  maxMs: number;
  minMs: number;
  totalMs: number;
};

export type EndpointRow = {
  avgMs: number | null;
  errorRate: number;
  errors: number;
  key: string;
  method: string;
  p95Ms: number | null;
  path: string;
  total: number;
};

export type ServiceStatusSummary = {
  delayText: string;
  hitText: string;
  requestText: string;
};

export const SERVICE_STATUS_TARGETS = [
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

export type ServiceStatusTarget = (typeof SERVICE_STATUS_TARGETS)[number];
export type ServiceStatusTargetKey = ServiceStatusTarget['key'];

export function getCounterLabels(
  t: (key: string) => string,
): Record<string, string> {
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

export function aggregateDurations(
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

export function estimatePercentile(
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

export function sumCounters(
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

export function formatBytes(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  const mb = (value as number) / 1024 / 1024;
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatCount(value: number | undefined) {
  return Number.isFinite(value) ? (value as number).toLocaleString() : '-';
}

export function formatMs(value: number | null | undefined) {
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

export function formatPercent(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return `${((value as number) * 100).toFixed(2)}%`;
}

export function formatUptime(seconds: number | undefined) {
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

export function getAverageMs(aggregate: DurationAggregate) {
  return aggregate.count > 0 ? aggregate.totalMs / aggregate.count : null;
}

export function buildRequestSeries(
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

export function buildDurationSeries(
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

export function buildRedisSeries(
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

export function buildEndpointRows(
  snapshot?: InternalMetricsResponse,
): EndpointRow[] {
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

export function buildServiceStatusSummary(
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
