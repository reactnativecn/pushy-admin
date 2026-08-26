import { describe, expect, test } from 'bun:test';
import {
  FILTER_KEYS,
  normalizeFilter,
  parsePlatformFilter,
  parseStatusFilter,
  SORTABLE_COLUMNS,
} from './admin-apps.logic';

describe('table config', () => {
  test('checkCount is not sortable, the SQL columns are', () => {
    expect(SORTABLE_COLUMNS.has('checkCount')).toBe(false);
    expect(SORTABLE_COLUMNS.has('userId')).toBe(true);
    expect(SORTABLE_COLUMNS.has('ignoreBuildTime')).toBe(true);
    expect(FILTER_KEYS).toEqual(['platform', 'status', 'userId']);
  });
});

describe('normalizeFilter', () => {
  test('passes non-userId filters through untouched', () => {
    expect(normalizeFilter('platform', 'ios')).toBe('ios');
    expect(normalizeFilter('status', undefined)).toBeUndefined();
  });

  test('userId keeps only positive integers', () => {
    expect(normalizeFilter('userId', '12')).toBe('12');
    expect(normalizeFilter('userId', '0')).toBeUndefined();
    expect(normalizeFilter('userId', '-3')).toBeUndefined();
    expect(normalizeFilter('userId', '1.5')).toBeUndefined();
    expect(normalizeFilter('userId', 'abc')).toBeUndefined();
    expect(normalizeFilter('userId', undefined)).toBeUndefined();
  });
});

describe('parsePlatformFilter / parseStatusFilter', () => {
  test('only whitelisted values survive', () => {
    expect(parsePlatformFilter('ios')).toBe('ios');
    expect(parsePlatformFilter('harmony')).toBe('harmony');
    expect(parsePlatformFilter('windows')).toBeUndefined();
    expect(parsePlatformFilter('')).toBeUndefined();
    expect(parsePlatformFilter(null)).toBeUndefined();

    expect(parseStatusFilter('paused')).toBe('paused');
    expect(parseStatusFilter('normal')).toBe('normal');
    expect(parseStatusFilter('deleted')).toBeUndefined();
    expect(parseStatusFilter(null)).toBeUndefined();
  });
});
