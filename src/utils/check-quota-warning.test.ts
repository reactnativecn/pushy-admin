import { describe, expect, test } from 'bun:test';
import {
  CHECK_QUOTA_LOW_RATIO,
  getCheckQuotaWarningState,
} from './check-quota-warning';

describe('getCheckQuotaWarningState', () => {
  test('returns normal without complete quota data', () => {
    const state = getCheckQuotaWarningState({
      dailyQuota: undefined,
      remaining: 100,
    });

    expect(state.hasData).toBe(false);
    expect(state.level).toBe('normal');
    expect(state.percent).toBe(0);
  });

  test('keeps healthy remaining quota normal', () => {
    const state = getCheckQuotaWarningState({
      dailyQuota: 1000,
      remaining: 600,
    });

    expect(state.hasData).toBe(true);
    expect(state.level).toBe('normal');
    expect(state.percent).toBe(60);
  });

  test('marks quota at the low threshold as low', () => {
    const remaining = 1000 * CHECK_QUOTA_LOW_RATIO;
    const state = getCheckQuotaWarningState({ dailyQuota: 1000, remaining });

    expect(state.isLow).toBe(true);
    expect(state.level).toBe('low');
    expect(state.percent).toBe(20);
  });

  test('marks zero or negative remaining quota as exceeded', () => {
    const zeroState = getCheckQuotaWarningState({
      dailyQuota: 1000,
      remaining: 0,
    });
    const negativeState = getCheckQuotaWarningState({
      dailyQuota: 1000,
      remaining: -12,
    });

    expect(zeroState.isExceeded).toBe(true);
    expect(zeroState.level).toBe('exceeded');
    expect(zeroState.percent).toBe(0);
    expect(negativeState.isExceeded).toBe(true);
    expect(negativeState.level).toBe('exceeded');
    expect(negativeState.percent).toBe(0);
  });
});
