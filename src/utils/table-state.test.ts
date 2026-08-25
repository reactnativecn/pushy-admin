import { describe, expect, test } from 'bun:test';
import {
  getDefaultPageSize,
  getTablePagination,
  parseOptionalPositiveInt,
  parsePositiveInt,
} from './table-state';

describe('parsePositiveInt', () => {
  test('accepts positive integers', () => {
    expect(parsePositiveInt('3', 1)).toBe(3);
    expect(parsePositiveInt('20', 1)).toBe(20);
  });

  test('falls back for missing, zero, negative, float or junk', () => {
    expect(parsePositiveInt(null, 1)).toBe(1);
    expect(parsePositiveInt('', 7)).toBe(7);
    expect(parsePositiveInt('0', 7)).toBe(7);
    expect(parsePositiveInt('-2', 7)).toBe(7);
    expect(parsePositiveInt('1.5', 7)).toBe(7);
    expect(parsePositiveInt('abc', 7)).toBe(7);
  });
});

describe('parseOptionalPositiveInt', () => {
  test('returns the number or undefined', () => {
    expect(parseOptionalPositiveInt('42')).toBe(42);
    expect(parseOptionalPositiveInt(null)).toBeUndefined();
    expect(parseOptionalPositiveInt('')).toBeUndefined();
    expect(parseOptionalPositiveInt('0')).toBeUndefined();
    expect(parseOptionalPositiveInt('abc')).toBeUndefined();
  });
});

describe('getDefaultPageSize', () => {
  test('mobile gets a smaller page', () => {
    expect(getDefaultPageSize(true)).toBe(10);
    expect(getDefaultPageSize(false)).toBe(20);
  });
});

describe('getTablePagination', () => {
  const showTotal = (count: number) => `${count} rows`;

  test('desktop: quick jumper, size changer and total', () => {
    const pagination = getTablePagination(
      { isMobile: false, page: 2, pageSize: 20 },
      55,
      showTotal,
    );
    expect(pagination).toMatchObject({
      current: 2,
      pageSize: 20,
      total: 55,
      simple: false,
      showQuickJumper: true,
      showSizeChanger: true,
    });
    expect(pagination.showTotal).toBe(showTotal);
  });

  test('mobile: simple pager without total', () => {
    const pagination = getTablePagination(
      { isMobile: true, page: 1, pageSize: 10 },
      55,
      showTotal,
    );
    expect(pagination).toMatchObject({
      simple: true,
      showQuickJumper: false,
      showSizeChanger: false,
    });
    expect(pagination.showTotal).toBeUndefined();
  });
});
