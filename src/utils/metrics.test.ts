import { describe, expect, test } from 'bun:test';
import {
  aggregateSeries,
  attachSharePercent,
  buildLegendDefaults,
  buildTotalSeries,
  type CategoryPoint,
  sumByTime,
} from './metrics';

type Point = CategoryPoint & { isTotal?: boolean };

const T1 = '2026-01-01T00:00:00.000Z';
const T2 = '2026-01-01T01:00:00.000Z';

const points: Point[] = [
  { time: T1, value: 30, category: 'a' },
  { time: T1, value: 10, category: 'b' },
  { time: T2, value: 5, category: 'a' },
  { time: T2, value: 15, category: 'c' },
];

const isTotal = (point: Point) => Boolean(point.isTotal);

describe('sumByTime', () => {
  test('sums values per time bucket', () => {
    expect([...sumByTime(points).entries()]).toEqual([
      [T1, 40],
      [T2, 20],
    ]);
  });
});

describe('attachSharePercent', () => {
  test('uses the bucket sum as denominator when there is no total point', () => {
    const result = attachSharePercent(points);
    expect(result.map((p) => p.sharePercent)).toEqual([75, 25, 25, 75]);
  });

  test('prefers the total point as denominator and leaves it untouched', () => {
    const total: Point = {
      time: T1,
      value: 80,
      category: 'total',
      isTotal: true,
    };
    const result = attachSharePercent([total, ...points], isTotal);
    expect(result[0]).toBe(total);
    expect(result[1]?.sharePercent).toBe(37.5);
    expect(result[2]?.sharePercent).toBe(12.5);
    // T2 has no total point, falls back to the bucket sum
    expect(result[3]?.sharePercent).toBe(25);
  });

  test('leaves points alone when the denominator is zero', () => {
    const zero: Point = { time: T1, value: 0, category: 'a' };
    const result = attachSharePercent([zero]);
    expect(result[0]).toBe(zero);
    expect(result[0]?.sharePercent).toBeUndefined();
  });
});

describe('buildTotalSeries', () => {
  test('synthesizes one point per bucket sorted by time', () => {
    expect(buildTotalSeries([...points].reverse(), 'total')).toEqual([
      { time: T1, value: 40, category: 'total' },
      { time: T2, value: 20, category: 'total' },
    ]);
  });

  test('returns an empty series for no points', () => {
    expect(buildTotalSeries([], 'total')).toEqual([]);
  });
});

describe('aggregateSeries', () => {
  test('ranks categories by window total', () => {
    const result = aggregateSeries(points);
    expect([...result.categoryTotals.entries()]).toEqual([
      ['a', 35],
      ['b', 10],
      ['c', 15],
    ]);
    expect(result.sortedCategories).toEqual(['a', 'c', 'b']);
    expect(result.topCategories).toEqual([
      ['a', 35],
      ['c', 15],
      ['b', 10],
    ]);
    expect(result.hasTotal).toBe(false);
    expect(result.total).toBe(60);
  });

  test('excludes total points from categories but uses them for the total', () => {
    const result = aggregateSeries(
      [{ time: T1, value: 100, category: 'total', isTotal: true }, ...points],
      { isTotal },
    );
    expect(result.categoryTotals.has('total')).toBe(false);
    expect(result.hasTotal).toBe(true);
    expect(result.total).toBe(100);
  });

  test('honours topN', () => {
    expect(aggregateSeries(points, { topN: 1 }).topCategories).toEqual([
      ['a', 35],
    ]);
  });
});

describe('buildLegendDefaults', () => {
  const sorted = ['a', 'b', 'c', 'd'];

  test('selects top N and keeps the full ranking as color domain', () => {
    expect(buildLegendDefaults(sorted, { topN: 2 })).toEqual({
      defaultLegendValues: ['a', 'b'],
      colorDomain: ['a', 'b', 'c', 'd'],
    });
  });

  test('puts the total label first in both lists', () => {
    expect(buildLegendDefaults(sorted, { totalLabel: 'T', topN: 2 })).toEqual({
      defaultLegendValues: ['T', 'a', 'b'],
      colorDomain: ['T', 'a', 'b', 'c', 'd'],
    });
  });

  test('pins categories outside the top N but ignores unknown ones', () => {
    expect(
      buildLegendDefaults(sorted, { topN: 2, pinned: ['d', 'a', 'zzz'] })
        .defaultLegendValues,
    ).toEqual(['a', 'b', 'd']);
  });

  test('defaults to top 10', () => {
    const many = Array.from({ length: 12 }, (_, i) => `c${i}`);
    expect(buildLegendDefaults(many).defaultLegendValues).toHaveLength(10);
  });
});
