import { describe, expect, it } from 'bun:test';
import {
  aggregateDurations,
  buildEndpointRows,
  buildServiceStatusSummary,
  estimatePercentile,
  formatBytes,
  formatMs,
  formatPercent,
  formatUptime,
  getAverageMs,
  sumCounters,
} from './metrics';

const makeDuration = (
  overrides: Partial<{
    buckets: Record<string, number>;
    count: number;
    labels: Record<string, string>;
    maxMs: number;
    minMs: number;
    name: string;
    totalMs: number;
  }> = {},
) => ({
  avgMs: 0,
  buckets: {},
  count: 0,
  labels: {},
  maxMs: 0,
  minMs: 0,
  name: 'api.request.duration',
  p50Ms: null,
  p95Ms: null,
  p99Ms: null,
  totalMs: 0,
  ...overrides,
});

describe('sumCounters', () => {
  const counters = [
    { labels: { path: '/a' }, name: 'api.request.total', value: 10 },
    { labels: { path: '/b' }, name: 'api.request.total', value: 5 },
    { labels: { path: '/a' }, name: 'api.request.error', value: 2 },
  ];

  it('sums only matching counter names', () => {
    expect(sumCounters(counters, 'api.request.total')).toBe(15);
    expect(sumCounters(counters, 'api.request.error')).toBe(2);
    expect(sumCounters(counters, 'missing')).toBe(0);
  });

  it('applies the predicate filter', () => {
    expect(
      sumCounters(
        counters,
        'api.request.total',
        (entry) => entry.labels.path === '/a',
      ),
    ).toBe(10);
  });
});

describe('aggregateDurations / estimatePercentile', () => {
  it('aggregates counts and buckets across entries', () => {
    const aggregate = aggregateDurations([
      makeDuration({
        buckets: { '<=10': 5, '<=25': 3 },
        count: 8,
        maxMs: 20,
        minMs: 1,
        totalMs: 80,
      }),
      makeDuration({
        buckets: { '<=25': 2, '+Inf': 1 },
        count: 3,
        maxMs: 15_000,
        minMs: 12,
        totalMs: 15_030,
      }),
    ]);

    expect(aggregate.count).toBe(11);
    expect(aggregate.totalMs).toBe(15_110);
    expect(aggregate.maxMs).toBe(15_000);
    expect(aggregate.minMs).toBe(1);
    expect(aggregate.buckets['<=25']).toBe(5);
    expect(getAverageMs(aggregate)).toBe(15_110 / 11);
  });

  it('estimates percentiles from bucket boundaries', () => {
    const aggregate = aggregateDurations([
      makeDuration({
        buckets: { '<=10': 90, '<=100': 9, '+Inf': 1 },
        count: 100,
        totalMs: 1000,
      }),
    ]);

    expect(estimatePercentile(aggregate, undefined, 0.5)).toBe(10);
    expect(estimatePercentile(aggregate, undefined, 0.95)).toBe(100);
    expect(estimatePercentile(aggregate, undefined, 1)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('returns null for an empty aggregate', () => {
    const aggregate = aggregateDurations([]);
    expect(estimatePercentile(aggregate, undefined, 0.95)).toBeNull();
    expect(getAverageMs(aggregate)).toBeNull();
  });
});

describe('buildEndpointRows', () => {
  it('groups by method+path with error rates and sorts by volume', () => {
    const rows = buildEndpointRows({
      buckets: [],
      config: { bucketCount: 0, bucketMs: 0, durationBucketsMs: [] },
      counters: [
        {
          labels: { method: 'GET', path: '/a' },
          name: 'api.request.total',
          value: 10,
        },
        {
          labels: { method: 'GET', path: '/b' },
          name: 'api.request.total',
          value: 90,
        },
        {
          labels: { method: 'GET', path: '/a' },
          name: 'api.request.error',
          value: 5,
        },
      ],
      durations: [],
      generatedAt: '',
      process: {
        memory: {
          arrayBuffers: 0,
          external: 0,
          heapTotal: 0,
          heapUsed: 0,
          rss: 0,
        },
        pid: 1,
        uptimeSeconds: 0,
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].path).toBe('/b');
    expect(rows[1].errorRate).toBe(0.5);
  });
});

describe('buildServiceStatusSummary', () => {
  it('returns placeholders without a snapshot', () => {
    expect(buildServiceStatusSummary(undefined)).toEqual({
      delayText: '-',
      hitText: '-',
      requestText: '-',
    });
  });
});

describe('formatters', () => {
  it('formats byte sizes into MB/GB', () => {
    expect(formatBytes(undefined)).toBe('-');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50.0 MB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
  });

  it('formats durations into ms/s with overflow marker', () => {
    expect(formatMs(null)).toBe('-');
    expect(formatMs(250)).toBe('250ms');
    expect(formatMs(1500)).toBe('1.50s');
    expect(formatMs(Number.POSITIVE_INFINITY)).toBe('>10s');
  });

  it('formats percentages and uptime', () => {
    expect(formatPercent(0.1234)).toBe('12.34%');
    expect(formatUptime(90_000)).toBe('1d 1h');
    expect(formatUptime(3900)).toBe('1h 5m');
    expect(formatUptime(120)).toBe('2m');
  });
});
