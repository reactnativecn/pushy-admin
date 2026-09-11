import { describe, expect, it } from 'bun:test';
import {
  type AppGeoDay,
  parseGeoWindow,
  summarizeGeo,
} from './realtime-metrics-geo.logic';

const days: AppGeoDay[] = [
  {
    date: '2026-09-11',
    requests: 20,
    regions: { 广东: 10, 北京: 6, 未知: 3, ' ': 1 },
  },
  { date: '2026-09-10', requests: 5, regions: { 广东: 2, 美国: 3 } },
  { date: '2026-09-09', requests: 0, regions: {} },
];

describe('summarizeGeo', () => {
  it('sums only the days inside the window, newest first', () => {
    const today = summarizeGeo(days, 'today');
    expect(today.total).toBe(20);
    expect(today.top.map((item) => item.region)).toEqual([
      '广东',
      '北京',
      '未知',
    ]);
    // 空白地区名归入未知，未知参与总量并单独计数
    expect(today.unknown).toBe(4);
    expect(today.top[0]?.percent).toBe(50);

    const week = summarizeGeo(days, '7d');
    expect(week.total).toBe(25);
    expect(week.top[0]).toEqual({ region: '广东', count: 12, percent: 48 });
    expect(week.regionCount).toBe(4);
  });

  it('folds everything past the limit into rest and breaks ties by name', () => {
    const summary = summarizeGeo(
      [
        {
          date: '2026-09-11',
          requests: 6,
          regions: { c: 1, a: 2, b: 2, d: 1 },
        },
      ],
      'today',
      2,
    );
    expect(summary.top.map((item) => item.region)).toEqual(['a', 'b']);
    expect(summary.rest).toEqual({
      regions: 2,
      count: 2,
      percent: (2 / 6) * 100,
    });
  });

  it('is empty-safe', () => {
    expect(summarizeGeo(undefined, '30d')).toEqual({
      total: 0,
      unknown: 0,
      regionCount: 0,
      top: [],
      rest: null,
    });
    expect(
      summarizeGeo(
        [{ date: '2026-09-11', requests: 0, regions: { x: 0, y: -1 } }],
        'today',
      ).total,
    ).toBe(0);
  });
});

describe('parseGeoWindow', () => {
  it('falls back to today', () => {
    expect(parseGeoWindow('7d')).toBe('7d');
    expect(parseGeoWindow('bogus')).toBe('today');
    expect(parseGeoWindow(null)).toBe('today');
  });
});
