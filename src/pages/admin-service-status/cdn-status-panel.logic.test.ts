import { describe, expect, test } from 'bun:test';
import {
  averageGetMs,
  averageMbps,
  cdnWindowConfig,
  certDaysLeft,
  coverageShortfall,
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

describe('coverageShortfall', () => {
  test('覆盖完整的时段不提示，差一个采集周期也算完整', () => {
    expect(coverageShortfall(3600, 3600)).toBeNull();
    expect(coverageShortfall(3540, 3600)).toBeNull();
  });

  test('长度不固定的时段不提示', () => {
    expect(coverageShortfall(60, undefined)).toBeNull();
  });

  test('不足两天按小时报，否则按整天报', () => {
    expect(coverageShortfall(44_640, 7_776_000)).toEqual({
      unit: 'hours',
      value: 12.4,
    });
    expect(coverageShortfall(3 * 86_400 + 100, 7_776_000)).toEqual({
      unit: 'days',
      value: 3,
    });
  });
});

describe('cdnWindowConfig', () => {
  test('长时段刷新得比短时段慢', () => {
    expect(cdnWindowConfig('last90d').refreshMs).toBeGreaterThan(
      cdnWindowConfig('last1h').refreshMs,
    );
    expect(cdnWindowConfig('last7d').refreshMs).toBeGreaterThan(
      cdnWindowConfig('today').refreshMs,
    );
  });

  test('今日长度不固定，不提示覆盖不足', () => {
    expect(cdnWindowConfig('today').seconds).toBeUndefined();
  });

  test('昨日是完整的一天，已经不再变化，按长时段刷新', () => {
    expect(cdnWindowConfig('yesterday').seconds).toBe(86_400);
    expect(cdnWindowConfig('yesterday').refreshMs).toBe(
      cdnWindowConfig('last7d').refreshMs,
    );
  });
});
