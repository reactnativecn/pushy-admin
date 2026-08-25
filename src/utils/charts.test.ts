import { describe, expect, test } from 'bun:test';
import dayjs from 'dayjs';
import { buildTimeSeriesLineConfig, getRangePresets } from './charts';

const data = [
  { time: '2026-01-01T00:00:00.000Z', value: 1, category: 'a' },
  { time: '2026-01-01T01:00:00.000Z', value: 2, category: 'b' },
];

describe('buildTimeSeriesLineConfig', () => {
  test('applies the shared defaults', () => {
    const config = buildTimeSeriesLineConfig({
      data,
      isDark: false,
      height: 1,
    });
    expect(config.theme).toBe('classic');
    expect(config.shapeField).toBe('smooth');
    expect(config.colorField).toBe('category');
    expect(config.yField).toBe('value');
    expect(config.legend).toEqual({ position: 'top' });
    expect(config.interaction).toEqual({
      legendFilter: true,
      tooltip: { shared: true },
    });
    expect(config.xField(data[0]!)).toEqual(new Date(data[0]!.time));
    expect('title' in config.axis.x).toBe(false);
    expect(config.axis.y).toEqual({});
    expect('items' in config.tooltip).toBe(false);
    expect('onReady' in config).toBe(false);
    expect(config.scale).toBeUndefined();
  });

  test('switches theme in dark mode', () => {
    expect(
      buildTimeSeriesLineConfig({ data, isDark: true, height: 1 }).theme,
    ).toBe('classicDark');
  });

  test('formats the x axis with the requested time format', () => {
    const local = dayjs(data[0]!.time);
    const config = buildTimeSeriesLineConfig({
      data,
      isDark: false,
      height: 1,
    });
    expect(config.axis.x.labelFormatter(data[0]!.time)).toBe(
      local.format('MM/DD HH:mm'),
    );
    const short = buildTimeSeriesLineConfig({
      data,
      isDark: false,
      height: 1,
      axisTimeFormat: 'HH:mm',
    });
    expect(short.axis.x.labelFormatter(data[0]!.time)).toBe(
      local.format('HH:mm'),
    );
    // 无法解析的刻度原样返回
    expect(config.axis.x.labelFormatter('not a date')).toBe('not a date');
    expect(config.tooltip.title(data[0]!)).toBe(local.format('MM/DD HH:mm'));
  });

  test('wires titles, tooltip formatter and color domain', () => {
    const config = buildTimeSeriesLineConfig({
      data,
      isDark: false,
      height: 300,
      xTitle: 'X',
      yTitle: 'Y',
      sharedTooltip: false,
      formatTooltipValue: (point) => `${point.value}!`,
      colorDomain: ['b', 'a'],
    });
    expect(config.axis.x.title).toBe('X');
    expect(config.axis.y).toEqual({ title: 'Y' });
    expect(config.interaction.tooltip).toEqual({ shared: false });
    expect(config.height).toBe(300);
    expect(config.scale).toEqual({ color: { domain: ['b', 'a'] } });
    const item = config.tooltip.items?.[0]?.(data[1]!);
    expect(item).toEqual({ name: 'b', value: '2!' });
  });

  test('treats an empty color domain as unspecified', () => {
    expect(
      buildTimeSeriesLineConfig({
        data,
        isDark: false,
        height: 1,
        colorDomain: [],
      }).scale,
    ).toBeUndefined();
  });

  test('re-applies the legend filter after every render from the ref', () => {
    const legendValuesRef = { current: ['a'] };
    const config = buildTimeSeriesLineConfig({
      data,
      isDark: false,
      height: 1,
      legendValuesRef,
    });
    const emitted: unknown[][] = [];
    let afterRender: (() => void) | undefined;
    config.onReady?.({
      chart: {
        on: (...args: unknown[]) => {
          expect(args[0]).toBe('afterrender');
          afterRender = args[1] as () => void;
        },
        emit: (...args: unknown[]) => emitted.push(args),
      },
    });
    afterRender?.();
    expect(emitted).toEqual([
      ['legend:filter', { data: { channel: 'color', values: ['a'] } }],
    ]);
    // ref 更新后下一次渲染用新值；空列表不触发筛选
    legendValuesRef.current = [];
    afterRender?.();
    expect(emitted).toHaveLength(1);
  });
});

describe('getRangePresets', () => {
  const t = (key: string) => `L:${key}`;
  const now = dayjs('2026-01-10T12:00:00.000Z');

  test('emits only the requested windows in canonical order', () => {
    const presets = getRangePresets(
      t,
      { '7d': 'ns.range_7d', '24h': 'ns.range_24h', '3d': 'ns.range_3d' },
      now,
    );
    expect(presets.map((preset) => preset.label)).toEqual([
      'L:ns.range_24h',
      'L:ns.range_3d',
      'L:ns.range_7d',
    ]);
    expect(presets.map((preset) => preset.value[1])).toEqual([now, now, now]);
    expect(presets[0]?.value[0].toISOString()).toBe(
      now.subtract(24, 'hour').toISOString(),
    );
    expect(presets[1]?.value[0].toISOString()).toBe(
      now.subtract(3, 'day').toISOString(),
    );
    expect(presets[2]?.value[0].toISOString()).toBe(
      now.subtract(7, 'day').toISOString(),
    );
  });

  test('covers every window', () => {
    const presets = getRangePresets(
      t,
      { '1h': 'a', '6h': 'b', '24h': 'c', '3d': 'd', '7d': 'e', '30d': 'f' },
      now,
    );
    expect(presets.map((preset) => now.diff(preset.value[0], 'hour'))).toEqual([
      1, 6, 24, 72, 168, 720,
    ]);
  });

  test('returns nothing for an empty table', () => {
    expect(getRangePresets(t, {}, now)).toEqual([]);
  });
});
