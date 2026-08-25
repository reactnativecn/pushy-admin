import type { Dayjs, ManipulateType } from 'dayjs';
import dayjs from 'dayjs';
import type { RefObject } from 'react';

/** 时间序列折线图的最小数据点形状：各指标页的数据点都是它的超集。 */
export interface TimeSeriesPoint {
  time: string;
  value: number;
  category: string;
}

type ChartController = {
  emit: (...args: unknown[]) => unknown;
  on: (...args: unknown[]) => unknown;
};

export interface TimeSeriesLineOptions<P extends TimeSeriesPoint> {
  data: P[];
  isDark: boolean;
  height: number;
  /** x 轴标题；不传则不显示（版本健康趋势图没有）。 */
  xTitle?: string;
  /** y 轴标题；不传则不显示。 */
  yTitle?: string;
  /** x 轴刻度的时间格式，默认 'MM/DD HH:mm'；节点面板只看当天用 'HH:mm'。 */
  axisTimeFormat?: string;
  /** tooltip 单项的值文本；不传则交给 G2 默认渲染。 */
  formatTooltipValue?: (point: P) => string;
  /** 多条线同时命中时合并到一个 tooltip，默认开启。 */
  sharedTooltip?: boolean;
  /** 颜色域顺序（决定图例顺序）；空数组等同于不指定。 */
  colorDomain?: readonly string[];
  /**
   * 默认勾选的图例项。G2 的 legend:filter 只能在渲染完成后触发，此时
   * 闭包里的值已经过期，所以从 ref 读最新值；不传则不做默认筛选。
   */
  legendValuesRef?: RefObject<string[]>;
}

const DEFAULT_AXIS_TIME_FORMAT = 'MM/DD HH:mm';
const TOOLTIP_TIME_FORMAT = 'MM/DD HH:mm';

/**
 * 各指标页共用的时间序列折线图配置：主题跟随暗色模式、x 轴按时间格式化、
 * 平滑曲线、图例置顶。页面间的差异全部收敛到 options 里。
 */
export function buildTimeSeriesLineConfig<P extends TimeSeriesPoint>({
  data,
  isDark,
  height,
  xTitle,
  yTitle,
  axisTimeFormat = DEFAULT_AXIS_TIME_FORMAT,
  formatTooltipValue,
  sharedTooltip = true,
  colorDomain,
  legendValuesRef,
}: TimeSeriesLineOptions<P>) {
  return {
    theme: isDark ? 'classicDark' : 'classic',
    interaction: {
      legendFilter: true,
      tooltip: { shared: sharedTooltip },
    },
    data,
    xField: (point: P) => new Date(point.time),
    yField: 'value',
    colorField: 'category',
    shapeField: 'smooth',
    axis: {
      x: {
        ...(xTitle === undefined ? {} : { title: xTitle }),
        labelAutoRotate: true,
        labelFormatter: (value: string) => {
          const parsed = dayjs(value);
          return parsed.isValid() ? parsed.format(axisTimeFormat) : value;
        },
      },
      y: yTitle === undefined ? {} : { title: yTitle },
    },
    tooltip: {
      title: (point: P) => dayjs(point.time).format(TOOLTIP_TIME_FORMAT),
      ...(formatTooltipValue
        ? {
            items: [
              (point: P) => ({
                name: point.category,
                value: formatTooltipValue(point),
              }),
            ],
          }
        : {}),
    },
    legend: {
      position: 'top',
    },
    scale: colorDomain?.length
      ? {
          color: { domain: [...colorDomain] },
        }
      : undefined,
    ...(legendValuesRef
      ? {
          onReady: ({ chart }: { chart: ChartController }) => {
            try {
              chart.on('afterrender', () => {
                const values = legendValuesRef.current;
                if (!values.length) return;
                chart.emit('legend:filter', {
                  data: { channel: 'color', values },
                });
              });
            } catch (error) {
              console.error(error);
            }
          },
        }
      : {}),
    height,
  };
}

export type RangePresetKey = '1h' | '6h' | '24h' | '3d' | '7d' | '30d';

// 顺序即 RangePicker 里的展示顺序：短窗口在前
const RANGE_PRESET_DURATIONS: ReadonlyArray<
  [RangePresetKey, number, ManipulateType]
> = [
  ['1h', 1, 'hour'],
  ['6h', 6, 'hour'],
  ['24h', 24, 'hour'],
  ['3d', 3, 'day'],
  ['7d', 7, 'day'],
  ['30d', 30, 'day'],
];

/**
 * RangePicker 的"过去 N 小时/天"快捷项。labelKeys 只给出该页要展示的窗口
 * 及其文案 key（各页命名空间不同，见 constants/i18n-keys.ts），顺序固定。
 * 每次调用都以当前时刻为终点，所以要在渲染时调用而不是缓存。
 */
export function getRangePresets(
  t: (key: string) => string,
  labelKeys: Partial<Record<RangePresetKey, string>>,
  now: Dayjs = dayjs(),
): Array<{ label: string; value: [Dayjs, Dayjs] }> {
  const presets: Array<{ label: string; value: [Dayjs, Dayjs] }> = [];
  for (const [key, amount, unit] of RANGE_PRESET_DURATIONS) {
    const labelKey = labelKeys[key];
    if (!labelKey) continue;
    presets.push({
      label: t(labelKey),
      value: [now.subtract(amount, unit), now],
    });
  }
  return presets;
}
