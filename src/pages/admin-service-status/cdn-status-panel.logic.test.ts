import { describe, expect, test } from 'bun:test';
import {
  averageGetMs,
  averageMbps,
  certDaysLeft,
  formatMbps,
  safeRatio,
} from './cdn-status-panel.logic';

describe('averageMbps', () => {
  test('按实际覆盖的时长折算', () => {
    expect(averageMbps(37_500_000, 300)).toBe(1);
  });

  test('还没有覆盖时长时没有结果', () => {
    expect(averageMbps(100, 0)).toBeNull();
  });
});

describe('formatMbps', () => {
  test('小带宽保留一位小数，大带宽取整', () => {
    expect(formatMbps(12.34)).toBe('12.3 Mbps');
    expect(formatMbps(160.4)).toBe('160 Mbps');
  });

  test('缺失值显示为横线', () => {
    expect(formatMbps(null)).toBe('-');
  });
});

describe('safeRatio', () => {
  test('分母为 0 时返回 null', () => {
    expect(safeRatio(1, 0)).toBeNull();
    expect(safeRatio(1, 4)).toBe(0.25);
  });
});

describe('averageGetMs', () => {
  test('没有下载时返回 null', () => {
    expect(averageGetMs(0, 0)).toBeNull();
    expect(averageGetMs(300, 3)).toBe(100);
  });
});

describe('certDaysLeft', () => {
  test('向下取整', () => {
    expect(certDaysLeft(86_400 * 2 - 1, 0)).toBe(1);
  });

  test('读不到证书时返回 null', () => {
    expect(certDaysLeft(0, 0)).toBeNull();
  });
});
