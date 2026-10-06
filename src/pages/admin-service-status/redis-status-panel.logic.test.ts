import { describe, expect, test } from 'bun:test';
import {
  formatExpiringShare,
  formatKBps,
  formatLatency,
  formatTtl,
  usageLevel,
  usageRatio,
} from './redis-status-panel.logic';

describe('usageRatio', () => {
  test('divides and guards an unlimited ceiling', () => {
    expect(usageRatio(512, 1024)).toBe(0.5);
    expect(usageRatio(512, 0)).toBeNull();
    expect(usageRatio(Number.NaN, 1024)).toBeNull();
  });
});

describe('usageLevel', () => {
  test('warns from 80% and alarms from 90%', () => {
    expect(usageLevel(null)).toBe('normal');
    expect(usageLevel(0.79)).toBe('normal');
    expect(usageLevel(0.8)).toBe('warning');
    expect(usageLevel(0.9)).toBe('danger');
  });
});

describe('formatKBps', () => {
  test('scales to MB/s', () => {
    expect(formatKBps(0)).toBe('0.0 KB/s');
    expect(formatKBps(147.21)).toBe('147 KB/s');
    expect(formatKBps(12.34)).toBe('12.3 KB/s');
    expect(formatKBps(2048)).toBe('2.00 MB/s');
    expect(formatKBps(-1)).toBe('-');
  });
});

describe('formatTtl', () => {
  test('picks a unit and hides empty samples', () => {
    expect(formatTtl(0)).toBe('-');
    expect(formatTtl(30_000)).toBe('30s');
    expect(formatTtl(5 * 60_000)).toBe('5m');
    expect(formatTtl(3 * 3_600_000)).toBe('3.0h');
    expect(formatTtl(632_961_600)).toBe('7.3d');
  });
});

describe('formatLatency', () => {
  test('keeps one decimal below 100 ms', () => {
    expect(formatLatency(1.234)).toBe('1.2 ms');
    expect(formatLatency(150.4)).toBe('150 ms');
    expect(formatLatency(undefined)).toBe('-');
  });
});

describe('formatExpiringShare', () => {
  test('rounds down so a few persistent keys stay visible', () => {
    expect(formatExpiringShare(1_520_414, 1_520_423)).toBe('99.9%');
    expect(formatExpiringShare(10, 10)).toBe('100.0%');
    expect(formatExpiringShare(1, 0)).toBe('-');
  });
});
