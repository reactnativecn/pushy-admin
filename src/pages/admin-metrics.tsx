import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  DatePicker,
  Radio,
  Select,
  Space,
  Spin,
  // Statistic,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { api } from '@/services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type MetricMode = 'pv' | 'uv';
type MetricKeyPrefix = 'rn' | 'os' | 'rnu';

interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
}

const TOTAL_SERIES_LABEL = 'total';

const metricKeyOptions = [
  { label: 'rn', value: 'rn' },
  { label: 'os', value: 'os' },
  { label: 'rnu', value: 'rnu' },
];

const getCategoryPrefix = (category: string) => {
  const separatorIndex = category.indexOf(':');
  if (separatorIndex === -1) return category.trim();
  return category.slice(0, separatorIndex).trim();
};

export const Component = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(24, 'hour'),
    dayjs(),
  ]);
  const [mode, setMode] = useState<MetricMode>('pv');
  const [selectedKeyPrefix, setSelectedKeyPrefix] =
    useState<MetricKeyPrefix>('rn');
  const legendValuesRef = useRef<string[]>([]);
  const lastAppliedLegendRef = useRef('');

  const { data, isLoading } = useQuery({
    queryKey: [
      'globalMetrics',
      dateRange[0].toISOString(),
      dateRange[1].toISOString(),
      mode,
    ],
    queryFn: () =>
      api.getGlobalMetrics({
        start: dateRange[0].toISOString(),
        end: dateRange[1].toISOString(),
        mode,
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!data?.data || !data?.dict) return [];
    const points: ChartDataPoint[] = [];
    for (const bucket of data.data) {
      for (const [dictIndex, count] of bucket.data) {
        const rawCategory = data.dict[dictIndex] || '';
        // Skip _total entry
        if (rawCategory === '_total') {
          continue;
        }
        // Treat empty values as 'unknown' (legacy data compatibility)
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
  }, [data]);

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

  const displayTotals = useMemo(() => {
    if (!prefixFilteredChartData.length) {
      return { total: 0, categories: new Map<string, number>() };
    }
    let total = 0;
    const categories = new Map<string, number>();
    for (const point of prefixFilteredChartData) {
      total += point.value;
      const existing = categories.get(point.category) || 0;
      categories.set(point.category, existing + point.value);
    }
    return { total, categories };
  }, [prefixFilteredChartData]);

  const topCategories = useMemo(() => {
    return Array.from(displayTotals.categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [displayTotals.categories]);

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // Line chart config
  const lineConfig = {
    interaction: {
      legendFilter: true,
      tooltip: { shared: true },
    },
    data: lineData,
    xField: (d: ChartDataPoint) => new Date(d.time),
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
        title: mode.toUpperCase(),
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
    onReady: ({ chart }: { chart: { on: Function; emit: Function } }) => {
      try {
        chart.on('afterrender', () => {
          const values = legendValuesRef.current;
          if (!values.length) return;
          const serialized = values.join('|');
          if (serialized === lastAppliedLegendRef.current) return;
          chart.emit('legend:filter', {
            data: { channel: 'color', values },
          });
          lastAppliedLegendRef.current = serialized;
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    },
    height: 480,
  };

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title level={4} className="m-0!">
            全局数据统计
          </Title>
          <Space>
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
              <Radio.Button value="pv">PV</Radio.Button>
              <Radio.Button value="uv">UV</Radio.Button>
            </Radio.Group>
            <Select
              placeholder="筛选 Key"
              showSearch={{
                optionFilterProp: 'label',
              }}
              value={selectedKeyPrefix}
              options={metricKeyOptions}
              onChange={(value) => setSelectedKeyPrefix(value)}
              className="w-40"
            />
            <RangePicker
              showTime
              value={dateRange}
              onChange={handleDateChange}
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
          </Space>
        </div>

        <Spin spinning={isLoading}>
          {/* Summary statistics */}
          {/* <div className="grid grid-cols-4 gap-4 mb-6">
            <Card size="small">
              <Statistic
                title={`总${mode.toUpperCase()}`}
                value={displayTotals.total}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
            {topCategories.slice(0, 3).map(([category, value]) => (
              <Card size="small" key={category}>
                <Statistic title={category} value={value} />
              </Card>
            ))}
          </div> */}

          {/* Chart */}
          <Card title="趋势图" size="small" style={{ marginBottom: 20 }}>
            {lineData.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                暂无数据
              </div>
            )}
          </Card>

          {/* Category breakdown */}
          {topCategories.length > 0 && (
            <Card title="分类统计 (Top 10)" size="small">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {topCategories.map(([category, value]) => (
                  <div key={category} className="p-3 bg-gray-50 rounded">
                    <div
                      className="text-xs text-gray-500 truncate"
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
