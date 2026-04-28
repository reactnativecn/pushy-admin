import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  DatePicker,
  Radio,
  Select,
  Spin,
  Statistic,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { patchSearchParams } from '@/utils/helper';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type MetricMode = 'pv' | 'uv';
type MetricKeyPrefix = 'rn' | 'os' | 'rnu';

interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
}

interface MetricsResponse {
  dict: string[];
  data: Array<{ time: string; data: Array<[number, number]> }>;
}

const TOTAL_SERIES_LABEL = 'total';
const DEFAULT_RANGE_HOURS = 24;
const modeLabels: Record<MetricMode, string> = {
  pv: '请求数',
  uv: '用户数',
};

const metricKeyOptions = [
  { label: 'rn', value: 'rn' },
  { label: 'os', value: 'os' },
  { label: 'rnu', value: 'rnu' },
] satisfies Array<{ label: string; value: MetricKeyPrefix }>;

const getCategoryPrefix = (category: string) => {
  const separatorIndex = category.indexOf(':');
  if (separatorIndex === -1) return category.trim();
  return category.slice(0, separatorIndex).trim();
};

const getMetricsTotal = (metrics?: MetricsResponse) => {
  if (!metrics?.data || !metrics.dict) return 0;

  let total = 0;
  for (const bucket of metrics.data) {
    let bucketTotal = 0;
    for (const [dictIndex, count] of bucket.data) {
      const key = metrics.dict[dictIndex];
      if (key === '_total') {
        bucketTotal = count;
        break;
      }
      bucketTotal += count;
    }
    total += bucketTotal;
  }

  return total;
};

type ChartController = {
  emit: (...args: unknown[]) => unknown;
  on: (...args: unknown[]) => unknown;
};

const parseMode = (value: string | null): MetricMode =>
  value === 'uv' ? 'uv' : 'pv';

const parseKeyPrefix = (value: string | null): MetricKeyPrefix =>
  metricKeyOptions.some((option) => option.value === value)
    ? (value as MetricKeyPrefix)
    : 'rn';

const createDefaultDateRange = (): [Dayjs, Dayjs] => {
  const end = dayjs();
  return [end.subtract(DEFAULT_RANGE_HOURS, 'hour'), end];
};

const parseDateRange = (
  searchParams: URLSearchParams,
  fallbackRange: [Dayjs, Dayjs],
): [Dayjs, Dayjs] => {
  const [fallbackStart, fallbackEnd] = fallbackRange;
  const parsedStart = searchParams.get('start')
    ? dayjs(searchParams.get('start'))
    : fallbackStart;
  const parsedEnd = searchParams.get('end')
    ? dayjs(searchParams.get('end'))
    : fallbackEnd;

  const start = parsedStart.isValid() ? parsedStart : fallbackStart;
  const end = parsedEnd.isValid() ? parsedEnd : fallbackEnd;
  if (start.isAfter(end)) {
    return [end.subtract(DEFAULT_RANGE_HOURS, 'hour'), end];
  }
  return [start, end];
};

export const Component = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const legendValuesRef = useRef<string[]>([]);
  const defaultRangeRef = useRef<[Dayjs, Dayjs] | null>(null);
  defaultRangeRef.current ??= createDefaultDateRange();

  const mode = parseMode(searchParams.get('mode'));
  const selectedKeyPrefix = parseKeyPrefix(searchParams.get('prefix'));
  const [rangeStart, rangeEnd] = parseDateRange(
    searchParams,
    defaultRangeRef.current,
  );
  const startDate = rangeStart.toISOString();
  const endDate = rangeEnd.toISOString();

  const { data: pvMetrics, isLoading: isLoadingPv } = useQuery({
    queryKey: ['globalMetrics', startDate, endDate, 'pv'],
    queryFn: () =>
      api.getGlobalMetrics({
        start: startDate,
        end: endDate,
        mode: 'pv',
      }),
  });

  const { data: uvMetrics, isLoading: isLoadingUv } = useQuery({
    queryKey: ['globalMetrics', startDate, endDate, 'uv'],
    queryFn: () =>
      api.getGlobalMetrics({
        start: startDate,
        end: endDate,
        mode: 'uv',
      }),
  });

  const metricsData = mode === 'pv' ? pvMetrics : uvMetrics;
  const isChartLoading = mode === 'pv' ? isLoadingPv : isLoadingUv;

  const chartData = useMemo(() => {
    if (!metricsData?.data || !metricsData?.dict) return [];

    const points: ChartDataPoint[] = [];
    for (const bucket of metricsData.data) {
      for (const [dictIndex, count] of bucket.data) {
        const rawCategory = metricsData.dict[dictIndex] || '';
        if (rawCategory === '_total') {
          continue;
        }

        let category = rawCategory.replace('\u001f', ': ');
        if (rawCategory.endsWith('\u001f')) {
          category = rawCategory.replace('\u001f', ': unknown');
        }

        points.push({
          time: bucket.time,
          value: count,
          category,
        });
      }
    }

    return points;
  }, [metricsData]);

  const prefixFilteredChartData = useMemo(() => {
    if (!chartData.length) return [];
    return chartData.filter(
      (point) => getCategoryPrefix(point.category) === selectedKeyPrefix,
    );
  }, [chartData, selectedKeyPrefix]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const point of prefixFilteredChartData) {
      totals.set(
        point.category,
        (totals.get(point.category) || 0) + point.value,
      );
    }
    return totals;
  }, [prefixFilteredChartData]);

  const sortedCategories = useMemo(() => {
    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
  }, [categoryTotals]);

  const totalSeriesData = useMemo(() => {
    if (!prefixFilteredChartData.length) return [];

    const totalsByTime = new Map<string, number>();
    for (const point of prefixFilteredChartData) {
      totalsByTime.set(
        point.time,
        (totalsByTime.get(point.time) || 0) + point.value,
      );
    }

    return Array.from(totalsByTime.entries())
      .map(([time, value]) => ({
        time,
        value,
        category: TOTAL_SERIES_LABEL,
      }))
      .sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
  }, [prefixFilteredChartData]);

  const defaultLegendValues = useMemo(() => {
    const topTen = sortedCategories.slice(0, 10);
    if (totalSeriesData.length === 0) return topTen;
    return [TOTAL_SERIES_LABEL, ...topTen];
  }, [sortedCategories, totalSeriesData]);

  const colorDomain = useMemo(() => {
    if (sortedCategories.length === 0) return [];
    if (totalSeriesData.length === 0) return sortedCategories;
    return [TOTAL_SERIES_LABEL, ...sortedCategories];
  }, [sortedCategories, totalSeriesData]);

  const lineData = useMemo(() => {
    if (!prefixFilteredChartData.length && !totalSeriesData.length) return [];
    return [...prefixFilteredChartData, ...totalSeriesData];
  }, [prefixFilteredChartData, totalSeriesData]);

  legendValuesRef.current = defaultLegendValues;

  const totalPv = useMemo(() => getMetricsTotal(pvMetrics), [pvMetrics]);
  const totalUv = useMemo(() => getMetricsTotal(uvMetrics), [uvMetrics]);

  const displayTotals = useMemo(() => {
    if (!prefixFilteredChartData.length) {
      return { total: 0, categories: new Map<string, number>() };
    }

    let total = 0;
    const categories = new Map<string, number>();
    for (const point of prefixFilteredChartData) {
      total += point.value;
      categories.set(
        point.category,
        (categories.get(point.category) || 0) + point.value,
      );
    }

    return { total, categories };
  }, [prefixFilteredChartData]);

  const topCategories = useMemo(() => {
    return Array.from(displayTotals.categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [displayTotals.categories]);

  const lineConfig = {
    interaction: {
      legendFilter: true,
      tooltip: { shared: true },
    },
    data: lineData,
    xField: (datum: ChartDataPoint) => new Date(datum.time),
    yField: 'value',
    colorField: 'category',
    shapeField: 'smooth',
    axis: {
      x: {
        title: '时间',
        labelAutoRotate: true,
        labelFormatter: (value: string) => {
          const parsed = dayjs(value);
          return parsed.isValid() ? parsed.format('MM/DD HH:mm') : value;
        },
      },
      y: {
        title: modeLabels[mode],
      },
    },
    tooltip: {
      channel: 'y',
    },
    legend: {
      position: 'top',
    },
    scale: colorDomain.length
      ? {
          color: { domain: colorDomain },
        }
      : undefined,
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
    height: 480,
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    patchSearchParams(setSearchParams, {
      start: dates?.[0] ? dates[0].toISOString() : undefined,
      end: dates?.[1] ? dates[1].toISOString() : undefined,
    });
  };

  return (
    <div className="page-section">
      <Card>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="m-0!">
              全局数据统计
            </Title>
            <div className="text-sm text-gray-500">
              当前时间范围、指标模式和分类前缀都会写入 URL，方便回放同一视图。
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <Radio.Group
              value={mode}
              onChange={(event) => {
                patchSearchParams(setSearchParams, {
                  mode: event.target.value as MetricMode,
                });
              }}
              className="w-full md:w-auto"
            >
              <Radio.Button value="pv">请求数</Radio.Button>
              <Radio.Button value="uv">用户数</Radio.Button>
            </Radio.Group>
            <Select
              placeholder="筛选 Key"
              showSearch
              optionFilterProp="label"
              value={selectedKeyPrefix}
              options={metricKeyOptions}
              onChange={(value) => {
                patchSearchParams(setSearchParams, { prefix: value });
              }}
              className="w-full md:w-40"
            />
            <RangePicker
              showTime
              value={[rangeStart, rangeEnd]}
              onChange={handleDateChange}
              className="w-full md:w-auto"
              presets={[
                {
                  label: '过去1小时',
                  value: [dayjs().subtract(1, 'hour'), dayjs()],
                },
                {
                  label: '过去6小时',
                  value: [dayjs().subtract(6, 'hour'), dayjs()],
                },
                {
                  label: '过去24小时',
                  value: [dayjs().subtract(24, 'hour'), dayjs()],
                },
                {
                  label: '过去7天',
                  value: [dayjs().subtract(7, 'day'), dayjs()],
                },
                {
                  label: '过去30天',
                  value: [dayjs().subtract(30, 'day'), dayjs()],
                },
              ]}
            />
          </div>
        </div>

        <Spin spinning={isChartLoading}>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card size="small">
              <Statistic
                title="总请求数"
                value={isLoadingPv ? '-' : totalPv.toLocaleString()}
              />
            </Card>
            <Card size="small">
              <Statistic
                title="总用户数"
                value={isLoadingUv ? '-' : totalUv.toLocaleString()}
              />
            </Card>
          </div>

          <Card size="small" style={{ marginBottom: 20 }}>
            {lineData.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div className="flex h-80 items-center justify-center text-gray-400">
                暂无数据
              </div>
            )}
          </Card>

          {topCategories.length > 0 && (
            <Card title="分类统计 (Top 10)" size="small">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {topCategories.map(([category, value]) => (
                  <div key={category} className="rounded bg-gray-50 p-3">
                    <div
                      className="truncate text-xs text-gray-500"
                      title={category}
                    >
                      {category}
                    </div>
                    <div className="text-lg font-semibold">
                      {value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Spin>
      </Card>
    </div>
  );
};
