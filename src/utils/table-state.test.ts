import { describe, expect, test } from 'bun:test';
import * as adminApps from '@/pages/admin-apps.logic';
import * as adminUsers from '@/pages/admin-users.logic';
import {
  buildTableChangePatch,
  getDefaultPageSize,
  getTablePagination,
  parseOptionalPositiveInt,
  parsePositiveInt,
  parseSortState,
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

describe('parseSortState', () => {
  const sortable = new Set(['id', 'name']);

  test('orderBy must be a sortable column, order defaults to desc', () => {
    expect(parseSortState(new URLSearchParams(), sortable)).toEqual({
      orderBy: undefined,
      order: undefined,
    });
    expect(
      parseSortState(new URLSearchParams({ orderBy: 'name' }), sortable),
    ).toEqual({ orderBy: 'name', order: 'desc' });
    expect(
      parseSortState(
        new URLSearchParams({ orderBy: 'name', order: 'asc' }),
        sortable,
      ),
    ).toEqual({ orderBy: 'name', order: 'asc' });
    expect(
      parseSortState(new URLSearchParams({ orderBy: 'secret' }), sortable),
    ).toEqual({ orderBy: undefined, order: undefined });
  });

  test('a table without sortable columns never sorts', () => {
    expect(
      parseSortState(new URLSearchParams({ orderBy: 'id' }), undefined),
    ).toEqual({ orderBy: undefined, order: undefined });
  });
});

describe('buildTableChangePatch', () => {
  const pagination = { current: 3, pageSize: 50 };

  test('always writes page and pageSize, falling back to the current size', () => {
    expect(
      buildTableChangePatch({
        pagination: {},
        filters: {},
        sorter: {},
        pageSize: 20,
      }),
    ).toEqual({ page: '1', pageSize: '20' });
    expect(
      buildTableChangePatch({
        pagination,
        filters: {},
        sorter: {},
        pageSize: 20,
      }),
    ).toEqual({ page: '3', pageSize: '50' });
  });

  test('admin-apps config: filters are normalised and sort is whitelisted', () => {
    const options = {
      pageSize: 20,
      filterKeys: adminApps.FILTER_KEYS,
      sortableColumns: adminApps.SORTABLE_COLUMNS,
      normalizeFilter: adminApps.normalizeFilter,
    };
    expect(
      buildTableChangePatch({
        ...options,
        pagination,
        filters: { platform: ['ios'], status: null, userId: ['0'] },
        sorter: { field: 'checkCount', order: 'ascend' },
      }),
    ).toEqual({
      page: '3',
      pageSize: '50',
      platform: 'ios',
      status: undefined,
      userId: undefined,
      orderBy: undefined,
      order: 'asc',
    });
    expect(
      buildTableChangePatch({
        ...options,
        pagination,
        filters: { userId: ['42'] },
        sorter: [{ field: 'userId', order: 'descend' }],
      }),
    ).toMatchObject({ userId: '42', orderBy: 'userId', order: 'desc' });
  });

  test('admin-users config: clearing the sorter clears both params', () => {
    const patch = buildTableChangePatch({
      pagination,
      filters: { status: ['dormant'], tier: [] },
      sorter: { field: 'email', order: undefined },
      pageSize: 20,
      filterKeys: adminUsers.FILTER_KEYS,
      sortableColumns: adminUsers.SORTABLE_COLUMNS,
    });
    expect(patch).toEqual({
      page: '3',
      pageSize: '50',
      status: 'dormant',
      tier: undefined,
      orderBy: undefined,
      order: undefined,
    });
  });

  test('numeric filter values are stringified, others dropped', () => {
    expect(
      buildTableChangePatch({
        pagination,
        filters: { status: [1], tier: [true] },
        sorter: {},
        pageSize: 20,
        filterKeys: ['status', 'tier'],
      }),
    ).toEqual({ page: '3', pageSize: '50', status: '1', tier: undefined });
  });

  test('without sortableColumns the sorter is ignored entirely', () => {
    expect(
      buildTableChangePatch({
        pagination,
        filters: {},
        sorter: { field: 'id', order: 'ascend' },
        pageSize: 20,
      }),
    ).toEqual({ page: '3', pageSize: '50' });
  });
});
