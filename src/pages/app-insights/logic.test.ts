import { describe, expect, it } from 'bun:test';
import {
  beijingToday,
  parseInsightDays,
  parseInsightView,
  rankCounts,
} from './logic';

describe('parameters and basic aggregation', () => {
  it('keeps URL compatibility and defaults', () => {
    expect(parseInsightDays('14')).toBe(14);
    expect(parseInsightDays('9')).toBe(7);
    expect(parseInsightDays('35')).toBe(30);
    expect(parseInsightView('versions')).toBe('versions');
    expect(parseInsightView(null)).toBe('overview');
    expect(beijingToday(Date.UTC(2026, 8, 26, 20))).toBe('2026-09-27');
  });
  it('ranks positive counts deterministically and drops invalid values', () => {
    expect(rankCounts({ b: 2, a: 2, c: -1, d: Number.NaN })).toEqual([
      { key: 'a', count: 2, percent: 50 },
      { key: 'b', count: 2, percent: 50 },
    ]);
    expect(rankCounts(undefined)).toEqual([]);
  });
});
