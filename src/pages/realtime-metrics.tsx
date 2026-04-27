import { Area, Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  DatePicker,
  Input,
  Radio,
  Select,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { patchSearchParams } from '@/utils/helper';
import { useAppList, useUserInfo } from '@/utils/hooks';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
  attribute?: MetricAttribute;
  isTotal?: boolean;
  rawValue?: string;
  sharePercent?: number;
}

type MetricAttribute = 'hash' | 'packageVersion_buildTime';

interface FormattedCategory {
  label: string;
  attribute?: MetricAttribute;
  isTotal: boolean;
  rawValue?: string;
}

interface ArrivalRatePoint {
  time: string;
  value: number;
  category: string;
  checks: number;
  totalChecks: number;
}

const TOTAL_LABEL = '查询热更次数';
const OTHER_ARRIVAL_LABEL = '其他热更包';
const NO_BUNDLE_LABEL = '未安装热更包';
const CATEGORY_SEPARATOR = '\u001f';
const MAX_ARRIVAL_SERIES_COUNT = 8;

type ChartController = {
  emit: (...args: unknown[]) => unknown;
  on: (...args: unknown[]) => unknown;
};

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
    const rawValue = value;
    if (!value || value === 'unknown') {
      value = '无';
    }
    if (key === 'hash') {
      return {
        label: `已更新到热更包: ${value}`,
        attribute: 'hash',
        isTotal: false,
        rawValue,
      };
    }
    if (key === 'packageVersion_buildTime') {
      return {
        label: `原生包: ${value}`,
        attribute: 'packageVersion_buildTime',
        isTotal: false,
        rawValue,
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

const formatTooltipItem = (point: ChartDataPoint) => {
  const countLabel = `${point.value.toLocaleString()} 次`;
  if (point.isTotal || point.sharePercent === undefined) {
    return countLabel;
  }
  return `${countLabel} (${point.sharePercent.toFixed(1)}%)`;
};

const formatArrivalRateItem = (point: ArrivalRatePoint) => {
  return `${point.value.toFixed(1)}% (${point.checks.toLocaleString()} / ${point.totalChecks.toLocaleString()} 次)`;
};

const formatPercentAxis = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(0)}%` : value;
};

const isArrivedHashValue = (value?: string) => {
  return !!value && value !== 'unknown';
};

export const Component = () => {
  const [searchParams, setSearchParams] = useSearchParams({
    attribute: 'hash',
  });
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(24, 'hour'),
    dayjs(),
  ]);
  const [manualAppKey, setManualAppKey] = useState('');
  const legendValuesRef = useRef<string[]>([]);

  const { apps } = useAppList();
  const { user } = useUserInfo();
  const isAdmin = user?.admin === true;
  const urlAppKey = searchParams.get('appKey') || undefined;
  const selectedAttribute: MetricAttribute =
    searchParams.get('attribute') === 'packageVersion_buildTime'
      ? 'packageVersion_buildTime'
      : 'hash';

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
  const selectedAppKey = useMemo(() => {
    if (!urlAppKey) {
      return undefined;
    }
    if (isAdmin || appOptions.some((opt) => opt.value === urlAppKey)) {
      return urlAppKey;
    }
    return undefined;
  }, [appOptions, isAdmin, urlAppKey]);

  // Default to first app if no selection
  useEffect(() => {
    if (!urlAppKey && appOptions.length > 0) {
      patchSearchParams(setSearchParams, {
        appKey: appOptions[0].value,
      });
    }
  }, [appOptions, setSearchParams, urlAppKey]);

  // Update URL when selection changes
  const handleAppChange = (appKey: string) => {
    patchSearchParams(setSearchParams, { appKey });
  };

  // Admin manual appKey input
  const handleManualAppKeySubmit = () => {
    if (manualAppKey.trim()) {
      patchSearchParams(setSearchParams, {
        appKey: manualAppKey.trim(),
      });
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
        const { label, attribute, isTotal, rawValue } =
          formatCategory(rawCategory);
        points.push({
          time: bucket.time,
          value: count,
          category: label,
          attribute,
          isTotal,
          rawValue,
        });
      }
    }
    return points;
  }, [data]);

  const filteredChartData = useMemo(() => {
    const selectedPoints = chartData.filter(
      (point) => point.isTotal || point.attribute === selectedAttribute,
    );
    const denominators = new Map<string, number>();
    const fallbackDenominators = new Map<string, number>();

    for (const point of selectedPoints) {
      if (point.isTotal) {
        denominators.set(
          point.time,
          (denominators.get(point.time) || 0) + point.value,
        );
      } else {
        fallbackDenominators.set(
          point.time,
          (fallbackDenominators.get(point.time) || 0) + point.value,
        );
      }
    }

    for (const [time, value] of fallbackDenominators) {
      if (!denominators.has(time)) {
        denominators.set(time, value);
      }
    }

    return selectedPoints.map((point) => {
      if (point.isTotal) {
        return point;
      }
      const denominator = denominators.get(point.time) || 0;
      if (denominator <= 0) {
        return point;
      }
      return {
        ...point,
        sharePercent: (point.value / denominator) * 100,
      };
    });
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

  const hotUpdateArrivalCategories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const point of chartData) {
      if (point.attribute !== 'hash' || !isArrivedHashValue(point.rawValue)) {
        continue;
      }
      totals.set(
        point.category,
        (totals.get(point.category) || 0) + point.value,
      );
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ARRIVAL_SERIES_COUNT)
      .map(([category]) => category);
  }, [chartData]);

  const hotUpdateArrivalColorDomain = useMemo(() => {
    return [
      ...hotUpdateArrivalCategories,
      OTHER_ARRIVAL_LABEL,
      NO_BUNDLE_LABEL,
    ];
  }, [hotUpdateArrivalCategories]);

  const hotUpdateArrivalData = useMemo(() => {
    const enabledCategories = new Set(hotUpdateArrivalCategories);
    const denominators = new Map<string, number>();
    const hashFallbackDenominators = new Map<string, number>();
    const arrivedTotals = new Map<string, number>();
    const categoryCountsByTime = new Map<string, Map<string, number>>();

    for (const point of chartData) {
      if (point.isTotal) {
        denominators.set(
          point.time,
          (denominators.get(point.time) || 0) + point.value,
        );
      }
      if (point.attribute === 'hash') {
        hashFallbackDenominators.set(
          point.time,
          (hashFallbackDenominators.get(point.time) || 0) + point.value,
        );
      }
      if (point.attribute === 'hash' && isArrivedHashValue(point.rawValue)) {
        arrivedTotals.set(
          point.time,
          (arrivedTotals.get(point.time) || 0) + point.value,
        );
        const counts =
          categoryCountsByTime.get(point.time) || new Map<string, number>();
        counts.set(
          point.category,
          (counts.get(point.category) || 0) + point.value,
        );
        categoryCountsByTime.set(point.time, counts);
      }
    }

    const times = Array.from(
      new Set([
        ...denominators.keys(),
        ...hashFallbackDenominators.keys(),
        ...categoryCountsByTime.keys(),
      ]),
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const points: ArrivalRatePoint[] = [];
    for (const time of times) {
      const fallbackDenominator = hashFallbackDenominators.get(time) || 0;
      const denominator = Math.max(
        denominators.get(time) || 0,
        fallbackDenominator,
      );
      if (denominator <= 0) {
        continue;
      }
      const counts =
        categoryCountsByTime.get(time) || new Map<string, number>();
      let selectedArrivedChecks = 0;

      for (const category of hotUpdateArrivalCategories) {
        const checks = counts.get(category) || 0;
        selectedArrivedChecks += checks;
        points.push({
          time,
          value: (checks / denominator) * 100,
          category,
          checks,
          totalChecks: denominator,
        });
      }

      const arrivedChecks = arrivedTotals.get(time) || 0;
      const otherChecks = Math.max(arrivedChecks - selectedArrivedChecks, 0);
      const noBundleChecks = Math.max(denominator - arrivedChecks, 0);
      if (enabledCategories.size > 0) {
        points.push({
          time,
          value: (otherChecks / denominator) * 100,
          category: OTHER_ARRIVAL_LABEL,
          checks: otherChecks,
          totalChecks: denominator,
        });
      }
      points.push({
        time,
        value: (noBundleChecks / denominator) * 100,
        category: NO_BUNDLE_LABEL,
        checks: noBundleChecks,
        totalChecks: denominator,
      });
    }

    return points;
  }, [chartData, hotUpdateArrivalCategories]);

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
      title: (point: ChartDataPoint) => dayjs(point.time).format('MM/DD HH:mm'),
      items: [
        (point: ChartDataPoint) => ({
          name: point.category,
          value: formatTooltipItem(point),
        }),
      ],
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
        // eslint-disable-next-line no-console
        console.error(error);
      }
    },
    height: 480,
  };

  const arrivalRateConfig = {
    interaction: {
      legendFilter: true,
      tooltip: { shared: true },
    },
    data: hotUpdateArrivalData,
    xField: (d: ArrivalRatePoint) => new Date(d.time),
    yField: 'value',
    colorField: 'category',
    shapeField: 'smooth',
    stack: true,
    style: {
      fillOpacity: 0.78,
    },
    line: {
      style: {
        lineWidth: 1,
      },
    },
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
        title: '抵达率',
        labelFormatter: formatPercentAxis,
      },
    },
    tooltip: {
      title: (point: ArrivalRatePoint) =>
        dayjs(point.time).format('MM/DD HH:mm'),
      items: [
        (point: ArrivalRatePoint) => ({
          name: point.category,
          value: formatArrivalRateItem(point),
        }),
      ],
    },
    legend: {
      position: 'top',
    },
    scale: {
      y: { domain: [0, 100] },
      color: { domain: hotUpdateArrivalColorDomain },
    },
    height: 420,
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
              onChange={(e) => {
                patchSearchParams(setSearchParams, {
                  attribute: e.target.value as MetricAttribute,
                });
              }}
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
            <Tabs
              items={[
                {
                  key: 'request-trend',
                  label: '请求趋势',
                  children: !selectedAppKey ? (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                      请选择应用
                    </div>
                  ) : filteredChartData.length > 0 ? (
                    <Line {...lineConfig} />
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                      暂无数据
                    </div>
                  ),
                },
                {
                  key: 'hot-update-arrival-rate',
                  label: '热更抵达率',
                  children: (
                    <>
                      <div className="mb-3 text-gray-500 text-xs">
                        使用百分比堆叠面积图展示各热更包份额随时间的变化，包含抵达量最高的
                        Top {MAX_ARRIVAL_SERIES_COUNT}
                        热更包、其他热更包和未安装热更包。
                      </div>
                      {!selectedAppKey ? (
                        <div className="h-80 flex items-center justify-center text-gray-400">
                          请选择应用
                        </div>
                      ) : hotUpdateArrivalData.length > 0 ? (
                        <Area {...arrivalRateConfig} />
                      ) : (
                        <div className="h-80 flex items-center justify-center text-gray-400">
                          暂无热更抵达率数据
                        </div>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Spin>
      </Card>
    </div>
  );
};
