import { describe, expect, test } from 'bun:test';
import { buildQuotaUsageRows, getMaxCount, getQuotaUsage } from './quota-usage';

const t = (key: string) => key;
const quota = { app: 3, bundle: 30, package: 30 };

describe('getMaxCount', () => {
  test('takes the largest count, treating missing as 0', () => {
    expect(getMaxCount([])).toBe(0);
    expect(getMaxCount([undefined, undefined])).toBe(0);
    expect(getMaxCount([2, undefined, 7, 3])).toBe(7);
  });
});

describe('getQuotaUsage', () => {
  test('percent is capped at 100 and status flips only when over the limit', () => {
    expect(getQuotaUsage(0, 3)).toEqual({ percent: 0, status: 'normal' });
    expect(getQuotaUsage(3, 3)).toEqual({ percent: 100, status: 'normal' });
    expect(getQuotaUsage(4, 3)).toEqual({ percent: 100, status: 'exception' });
    expect(getQuotaUsage(1, 4)).toEqual({ percent: 25, status: 'normal' });
  });
});

describe('buildQuotaUsageRows', () => {
  const base = {
    t,
    quota,
    appCount: 2,
    maxVersionCount: 31,
    maxPackageCount: 15,
    isVersionCountLoading: false,
    isPackageCountLoading: false,
  };

  test('produces app / bundle / package rows with usage math', () => {
    const rows = buildQuotaUsageRows(base);
    expect(rows.map((row) => row.key)).toEqual(['app', 'bundle', 'package']);
    expect(rows[0]).toMatchObject({
      limit: 3,
      percent: (2 / 3) * 100,
      status: 'normal',
      value: '2 / 3 user.count_unit',
      note: 'user.app_count_note',
    });
    expect(rows[1]).toMatchObject({
      limit: 30,
      loading: false,
      percent: 100,
      status: 'exception',
      value: '31 / 30 user.count_unit',
      note: 'user.max_single_app',
    });
    expect(rows[2]).toMatchObject({
      limit: 30,
      percent: 50,
      status: 'normal',
      value: '15 / 30 user.count_unit',
    });
  });

  test('loading rows show a placeholder and zero progress', () => {
    const rows = buildQuotaUsageRows({
      ...base,
      isVersionCountLoading: true,
      isPackageCountLoading: true,
    });
    expect(rows[1]).toMatchObject({
      loading: true,
      percent: 0,
      note: 'user.counting_hotfix',
      value: 'user.counting',
    });
    expect(rows[2]).toMatchObject({
      loading: true,
      percent: 0,
      note: 'user.counting_native',
      value: 'user.counting',
    });
  });
});
