import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Input, Radio, Select, Spin, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { useAppList, useUserInfo } from '@/utils/hooks';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
  attribute?: MetricAttribute;
  isTotal?: boolean;
}

type MetricAttribute = 'hash' | 'packageVersion_buildTime';

interface FormattedCategory {
  label: string;
  attribute?: MetricAttribute;
  isTotal: boolean;
}

const TOTAL_LABEL = '查询热更次数';
const CATEGORY_SEPARATOR = '\u001f';

const formatCategory = (rawCategory: string): FormattedCategory => {
  if (!rawCategory) {
    return { label: 'unknown', isTotal: false };
  }
  if (rawCategory === '_total' || rawCategory === 'total') {
    return { label: TOTAL_LABEL, isTotal: true };
  }
  const parts = rawCategory.split(CATEGORY_SEPARATOR);
  if (parts.length >= 2) {
    const key = parts[0];
    let value = parts.slice(1).join();
    if (!value || value === 'unknown') {
      value = '无';
    }
    if (key === 'hash') {
      return {
        label: `已更新到热更包: ${value}`,
        attribute: 'hash',
        isTotal: false,
      };
    }
    if (key === 'packageVersion_buildTime') {
      return {
        label: `原生包: ${value}`,
        attribute: 'packageVersion_buildTime',
        isTotal: false,
      };
    }
  }
  if (
    rawCategory.endsWith(CATEGORY_SEPARATOR) ||
    rawCategory.endsWith(`${CATEGORY_SEPARATOR}unknown`)
  ) {
    return {
      label: rawCategory.replace(CATEGORY_SEPARATOR, ': 无'),
      isTotal: false,
    };
  }
  return {
    label: rawCategory.replace(CATEGORY_SEPARATOR, ': '),
    isTotal: false,
  };
};

const attributeOptions = [
  { label: '热更包', value: 'hash' },
  { label: '原生包', value: 'packageVersion_buildTime' },
];

export const Component = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(24, 'hour'),
    dayjs(),
  ]);
  const [selectedAppKey, setSelectedAppKey] = useState<string | undefined>(
    searchParams.get('appKey') || undefined,
  );
  const [manualAppKey, setManualAppKey] = useState('');
  const [selectedAttribute, setSelectedAttribute] =
    useState<MetricAttribute>('hash');
  const legendValuesRef = useRef<string[]>([]);

  const { apps } = useAppList();
  const { user } = useUserInfo();
  const isAdmin = user?.admin === true;

  const appOptions = useMemo(() => {
    return (apps || []).reduce<{ label: string; value: string }[]>(
      (acc, app) => {
        if (app.appKey) {
          acc.push({
            label: app.name,
            value: app.appKey as string,
          });
        }
        return acc;
      },
      [],
    );
  }, [apps]);

  // Sync URL param to state on mount or URL change
  useEffect(() => {
    const urlAppKey = searchParams.get('appKey');
    if (urlAppKey && urlAppKey !== selectedAppKey) {
      // Admin can access any appKey, non-admin can only access their own
      if (isAdmin || appOptions.some((opt) => opt.value === urlAppKey)) {
        setSelectedAppKey(urlAppKey);
      }
    }
  }, [searchParams, isAdmin, appOptions, selectedAppKey]);

  // Default to first app if no selection
  useEffect(() => {
    if (
      !selectedAppKey &&
      appOptions.length > 0 &&
      !searchParams.get('appKey')
    ) {
      const firstAppKey = appOptions[0].value;
      setSelectedAppKey(firstAppKey);
      setSearchParams({ appKey: firstAppKey }, { replace: true });
    }
  }, [appOptions, selectedAppKey, searchParams, setSearchParams]);

  // Update URL when selection changes
  const handleAppChange = (appKey: string) => {
    setSelectedAppKey(appKey);
    setSearchParams({ appKey }, { replace: true });
  };

  // Admin manual appKey input
  const handleManualAppKeySubmit = () => {
    if (manualAppKey.trim()) {
      setSelectedAppKey(manualAppKey.trim());
      setSearchParams({ appKey: manualAppKey.trim() }, { replace: true });
      setManualAppKey('');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      'appMetrics',
      selectedAppKey,
      dateRange[0].toISOString(),
      dateRange[1].toISOString(),
    ],
    queryFn: () =>
      api.getAppMetrics({
        appKey: selectedAppKey!,
        start: dateRange[0].toISOString(),
        end: dateRange[1].toISOString(),
      }),
    enabled: !!selectedAppKey && !!dateRange[0] && !!dateRange[1],
  });

  const chartData = useMemo(() => {
    if (!data?.data || !data?.dict) return [];
    const points: ChartDataPoint[] = [];
    for (const bucket of data.data) {
      for (const [dictIndex, count] of bucket.data) {
        const rawCategory = data.dict[dictIndex] || '';
        const { label, attribute, isTotal } = formatCategory(rawCategory);
        points.push({
          time: bucket.time,
          value: count,
          category: label,
          attribute,
          isTotal,
        });
      }
    }
    return points;
  }, [data]);

  const filteredChartData = useMemo(() => {
    return chartData.filter(
      (point) => point.isTotal || point.attribute === selectedAttribute,
    );
  }, [chartData, selectedAttribute]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const point of filteredChartData) {
      if (point.isTotal) {
        continue;
      }
      totals.set(
        point.category,
        (totals.get(point.category) || 0) + point.value,
      );
    }
    return totals;
  }, [filteredChartData]);

  const sortedCategories = useMemo(() => {
    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
  }, [categoryTotals]);

  const hasTotal = useMemo(
    () => filteredChartData.some((point) => point.isTotal),
    [filteredChartData],
  );

  const totalRequests = useMemo(() => {
    if (!filteredChartData.length) return 0;
    if (hasTotal) {
      return filteredChartData.reduce(
        (sum, point) => (point.isTotal ? sum + point.value : sum),
        0,
      );
    }
    return filteredChartData.reduce((sum, point) => sum + point.value, 0);
  }, [filteredChartData, hasTotal]);

  const topCategories = useMemo(() => {
    return sortedCategories
      .slice(0, 10)
      .map(
        (category) => [category, categoryTotals.get(category) || 0] as const,
      );
  }, [sortedCategories, categoryTotals]);

  const topCategoryMax = useMemo(() => {
    return topCategories.length > 0 ? topCategories[0][1] : 0;
  }, [topCategories]);

  const dateRangeLabel = useMemo(() => {
    return `${dateRange[0].format('YYYY/MM/DD HH:mm')} - ${dateRange[1].format('YYYY/MM/DD HH:mm')}`;
  }, [dateRange]);

  const selectedAttributeLabel = useMemo(() => {
    return (
      attributeOptions.find((option) => option.value === selectedAttribute)
        ?.label || selectedAttribute
    );
  }, [selectedAttribute]);

  const defaultLegendValues = useMemo(() => {
    const topTen = sortedCategories.slice(0, 10);
    if (!hasTotal) return topTen;
    return [TOTAL_LABEL, ...topTen];
  }, [sortedCategories, hasTotal]);

  const colorDomain = useMemo(() => {
    if (hasTotal) {
      return [TOTAL_LABEL, ...sortedCategories];
    }
    return sortedCategories;
  }, [sortedCategories, hasTotal]);

  legendValuesRef.current = defaultLegendValues;

  const lineConfig = {
    interaction: {
      legendFilter: true,
      tooltip: { shared: true },
    },
    data: filteredChartData,
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
      y: {},
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
          chart.emit('legend:filter', {
            data: { channel: 'color', values },
          });
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    },
    height: 480,
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Title level={4} className="m-0!">
              实时数据
            </Title>
            {selectedAppKey && (
              <div className="max-w-[55%] truncate text-xs text-gray-500">
                App Key: {selectedAppKey}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-56">
              <Select
                placeholder="选择应用"
                showSearch
                optionFilterProp="label"
                value={selectedAppKey}
                onChange={handleAppChange}
                options={appOptions}
                style={{ width: '100%' }}
              />
            </div>
            <Radio.Group
              value={selectedAttribute}
              onChange={(e) => setSelectedAttribute(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              {attributeOptions.map((option) => (
                <Radio.Button key={option.value} value={option.value}>
                  {option.label}
                </Radio.Button>
              ))}
            </Radio.Group>
            {isAdmin && (
              <div className="w-full sm:w-52">
                <Input
                  placeholder="输入任意 App Key"
                  value={manualAppKey}
                  onChange={(e) => setManualAppKey(e.target.value)}
                  onPressEnter={handleManualAppKeySubmit}
                />
              </div>
            )}
            <div className="w-full xl:w-auto xl:min-w-[22rem]">
              <RangePicker
                showTime
                value={dateRange}
                onChange={handleDateChange}
                style={{ width: '100%' }}
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
                ]}
              />
            </div>
          </div>
        </div>

        <Spin spinning={isLoading}>
          <Card title="请求概览" size="small" style={{ marginBottom: 16 }}>
            {!selectedAppKey ? (
              <div className="h-20 flex items-center justify-center text-gray-400">
                请选择应用
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                  <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="text-xs text-gray-500">总请求数</div>
                    <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                      {isLoading ? '-' : totalRequests.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {dateRangeLabel}
                    </div>
                  </div>
                  <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="text-xs text-gray-500">分类数量</div>
                    <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                      {categoryTotals.size}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      当前维度：{selectedAttributeLabel}
                    </div>
                  </div>
                </div>

                {topCategories.length > 0 ? (
                  <div>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(180px, 1fr))',
                      }}
                    >
                      {topCategories.map(([category, value], index) => {
                        const sharePercent =
                          totalRequests > 0 ? (value / totalRequests) * 100 : 0;
                        const relativePercent =
                          topCategoryMax > 0
                            ? (value / topCategoryMax) * 100
                            : 0;
                        const barWidth =
                          value > 0 ? Math.max(relativePercent, 6) : 0;
                        const rankBadgeClass =
                          index === 0
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : index === 1
                              ? 'border-slate-200 bg-slate-50 text-slate-700'
                              : index === 2
                                ? 'border-orange-200 bg-orange-50 text-orange-700'
                                : 'border-gray-200 bg-gray-50 text-gray-600';

                        return (
                          <div
                            key={category}
                            className="min-w-0 rounded border border-gray-200 bg-white px-3 py-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${rankBadgeClass}`}
                              >
                                TOP {index + 1}
                              </span>
                              <span className="text-[11px] text-gray-500 tabular-nums">
                                {sharePercent.toFixed(1)}%
                              </span>
                            </div>

                            <div className="mt-2 text-xl font-semibold leading-none tabular-nums text-gray-900">
                              {value.toLocaleString()}
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100">
                              <div
                                className="h-full rounded bg-blue-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>

                            <div
                              className="mt-2 truncate text-xs text-gray-500"
                              title={category}
                            >
                              {category}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center text-gray-400">
                    暂无 Top 10 数据
                  </div>
                )}
              </div>
            )}
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            {!selectedAppKey ? (
              <div className="h-80 flex items-center justify-center text-gray-400">
                请选择应用
              </div>
            ) : filteredChartData.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                暂无数据
              </div>
            )}
          </Card>
        </Spin>
      </Card>
    </div>
  );
};
