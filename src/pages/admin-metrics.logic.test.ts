import { afterEach, describe, expect, setSystemTime, test } from 'bun:test';
import dayjs from 'dayjs';
import {
  buildChartPoints,
  buildDistributionPoints,
  createDefaultDateRange,
  DEFAULT_RANGE_HOURS,
  formatTooltipItem,
  getCategoryPrefix,
  getDistributionCategoryOrder,
  getMetricsTotal,
  type MetricsResponse,
  parseDateRange,
  parseKeyPrefix,
  parseMetricsTab,
  parseMode,
} from './admin-metrics.logic';

describe('distribution tabs and points', () => {
  test('parses only known tab keys', () => {
    expect(parseMetricsTab('write-clients')).toBe('write-clients');
    expect(parseMetricsTab('request-regions')).toBe('request-regions');
    expect(parseMetricsTab('unknown')).toBe('requests');
    expect(parseMetricsTab(null)).toBe('requests');
  });

  test('turns each day into percentages while preserving counts', () => {
    expect(
      buildDistributionPoints([
        { date: '2026-08-11', values: { 广东: 3, 北京: 1, invalid: 0 } },
        { date: '2026-08-10', values: { '': 2, broken: Number.NaN } },
      ]),
    ).toEqual([
      {
        time: '2026-08-11',
        category: '广东',
        value: 75,
        count: 3,
      },
      {
        time: '2026-08-11',
        category: '北京',
        value: 25,
        count: 1,
      },
      {
        time: '2026-08-10',
        category: 'unknown',
        value: 100,
        count: 2,
      },
    ]);
  });

  test('ranks legend categories by real volume instead of equal-weight daily share', () => {
    const points = buildDistributionPoints([
      { date: '2026-08-10', values: { x: 1 } },
      { date: '2026-08-11', values: { x: 100, y: 900 } },
    ]);

    // Percentage sums would rank x first (100% + 10% versus y's 90%), but
    // the actual window volumes are y=900 and x=101.
    expect(getDistributionCategoryOrder(points)).toEqual(['y', 'x']);
  });
});

describe('getCategoryPrefix', () => {
  test('takes the part before the colon, trimmed', () => {
    expect(getCategoryPrefix('rn: 0.72.1')).toBe('rn');
    expect(getCategoryPrefix(' os : ios')).toBe('os');
    expect(getCategoryPrefix('rnu:')).toBe('rnu');
  });

  test('returns the whole trimmed string without a colon', () => {
    expect(getCategoryPrefix('  total ')).toBe('total');
  });
});

describe('getMetricsTotal', () => {
  test('returns 0 without data', () => {
    expect(getMetricsTotal(undefined)).toBe(0);
    expect(getMetricsTotal({ dict: [], data: [] })).toBe(0);
  });

  test('sums every category when no _total is present', () => {
    const metrics: MetricsResponse = {
      dict: ['rn\u001f0.72', 'rn\u001f0.73'],
      data: [
        {
          time: 't1',
          data: [
            [0, 3],
            [1, 4],
          ],
        },
        { time: 't2', data: [[0, 1]] },
      ],
    };
    expect(getMetricsTotal(metrics)).toBe(8);
  });

  test('a _total entry overrides the running sum for its bucket', () => {
    const metrics: MetricsResponse = {
      dict: ['rn\u001f0.72', '_total', 'rn\u001f0.73'],
      data: [
        // 前面已累加 3,遇到 _total 后以 10 为准,后面的 100 不再计入
        {
          time: 't1',
          data: [
            [0, 3],
            [1, 10],
            [2, 100],
          ],
        },
        { time: 't2', data: [[0, 5]] },
      ],
    };
    expect(getMetricsTotal(metrics)).toBe(15);
  });
});

describe('buildChartPoints', () => {
  test('returns empty without data', () => {
    expect(buildChartPoints(undefined)).toEqual([]);
  });

  test('splits dict keys on the separator and skips _total', () => {
    const metrics: MetricsResponse = {
      dict: ['rn\u001f0.72', '_total', 'os\u001f', 'plain'],
      data: [
        {
          time: 't1',
          data: [
            [0, 3],
            [1, 99],
            [2, 2],
            [3, 1],
            [9, 7],
          ],
        },
      ],
    };
    expect(buildChartPoints(metrics)).toEqual([
      { time: 't1', value: 3, category: 'rn: 0.72' },
      { time: 't1', value: 2, category: 'os: unknown' },
      { time: 't1', value: 1, category: 'plain' },
      // 字典越界时类别退化为空串,不能让整张图渲染失败
      { time: 't1', value: 7, category: '' },
    ]);
  });
});

describe('formatTooltipItem', () => {
  test('total series and points without share show only the count', () => {
    expect(
      formatTooltipItem({ time: 't', value: 1234, category: 'total' }),
    ).toBe((1234).toLocaleString());
    expect(formatTooltipItem({ time: 't', value: 5, category: 'rn: 1' })).toBe(
      '5',
    );
  });

  test('other points append the share percent', () => {
    expect(
      formatTooltipItem({
        time: 't',
        value: 5,
        category: 'rn: 1',
        sharePercent: 12.345,
      }),
    ).toBe('5 (12.3%)');
  });
});

describe('parseMode / parseKeyPrefix', () => {
  test('mode defaults to pv', () => {
    expect(parseMode('uv')).toBe('uv');
    expect(parseMode('pv')).toBe('pv');
    expect(parseMode(null)).toBe('pv');
    expect(parseMode('xx')).toBe('pv');
  });

  test('prefix defaults to rn', () => {
    expect(parseKeyPrefix('os')).toBe('os');
    expect(parseKeyPrefix('rnu')).toBe('rnu');
    expect(parseKeyPrefix(null)).toBe('rn');
    expect(parseKeyPrefix('bogus')).toBe('rn');
  });
});

describe('parseDateRange', () => {
  const fallbackEnd = dayjs('2026-06-01T12:00:00');
  const fallbackStart = fallbackEnd.subtract(DEFAULT_RANGE_HOURS, 'hour');
  const fallback: [dayjs.Dayjs, dayjs.Dayjs] = [fallbackStart, fallbackEnd];

  test('uses the fallback when params are missing', () => {
    const [start, end] = parseDateRange(new URLSearchParams(), fallback);
    expect(start.isSame(fallbackStart)).toBe(true);
    expect(end.isSame(fallbackEnd)).toBe(true);
  });

  test('parses valid params', () => {
    const [start, end] = parseDateRange(
      new URLSearchParams({
        start: '2026-05-01T00:00:00Z',
        end: '2026-05-02T00:00:00Z',
      }),
      fallback,
    );
    expect(start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-02T00:00:00.000Z');
  });

  test('an invalid bound falls back individually', () => {
    // 兜底的开始时间要早于给定的结束时间,否则会触发倒置修正
    const [start, end] = parseDateRange(
      new URLSearchParams({ start: 'garbage', end: '2026-06-02T00:00:00Z' }),
      fallback,
    );
    expect(start.isSame(fallbackStart)).toBe(true);
    expect(end.toISOString()).toBe('2026-06-02T00:00:00.000Z');
  });

  test('start after end collapses to 24h before end', () => {
    const [start, end] = parseDateRange(
      new URLSearchParams({
        start: '2026-05-10T00:00:00Z',
        end: '2026-05-02T00:00:00Z',
      }),
      fallback,
    );
    expect(end.toISOString()).toBe('2026-05-02T00:00:00.000Z');
    expect(start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('createDefaultDateRange', () => {
  afterEach(() => {
    setSystemTime(null);
  });

  test('spans the default number of hours ending now', () => {
    setSystemTime(new Date('2026-06-01T00:00:00Z'));
    const [start, end] = createDefaultDateRange();
    expect(end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(end.diff(start, 'hour')).toBe(DEFAULT_RANGE_HOURS);
  });
});
