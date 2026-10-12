import { describe, expect, test } from 'bun:test';
import {
  formatBytes,
  formatCount,
  formatDateTime,
  formatInteger,
  formatPercent,
} from './format';

describe('formatCount / formatInteger', () => {
  test('missing is not zero', () => {
    expect(formatCount(null)).toBe('-');
    expect(formatCount(undefined, 'missing')).toBe('missing');
    expect(formatCount(Number.NaN)).toBe('-');
    expect(formatCount(0)).toBe('0');
  });

  test('formatInteger rounds before grouping', () => {
    expect(formatInteger(1234.6)).toBe((1235).toLocaleString());
    expect(formatInteger(Number.POSITIVE_INFINITY)).toBe('-');
  });
});

describe('formatPercent', () => {
  test('formats ratios with the requested precision', () => {
    expect(formatPercent(0.1234)).toBe('12.3%');
    expect(formatPercent(0.1234, 2)).toBe('12.34%');
  });

  test('keeps real zeros and negatives, hides missing', () => {
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(-0.5)).toBe('-50.0%');
    expect(formatPercent(null, 1, 'missing')).toBe('missing');
  });
});

describe('formatBytes', () => {
  test('scales across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(16 * 1024)).toBe('16.0 KB');
    expect(formatBytes(50 * 1024 ** 2)).toBe('50.0 MB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.50 GB');
    expect(formatBytes(300 * 1024 ** 4)).toBe('300 TB');
  });

  test('hides missing or invalid values', () => {
    expect(formatBytes(undefined)).toBe('-');
    expect(formatBytes(null)).toBe('-');
    expect(formatBytes(Number.NaN)).toBe('-');
    expect(formatBytes(-1, 'missing')).toBe('missing');
  });
});

describe('formatDateTime', () => {
  test('dashes for empty or unparsable input', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
    expect(formatDateTime('')).toBe('-');
    expect(formatDateTime('not a date')).toBe('-');
  });

  test('formats to minutes by default, seconds on request', () => {
    const value = new Date(2026, 3, 5, 6, 7, 8);
    expect(formatDateTime(value)).toBe('2026-04-05 06:07');
    expect(formatDateTime(value, { seconds: true })).toBe(
      '2026-04-05 06:07:08',
    );
  });
});
