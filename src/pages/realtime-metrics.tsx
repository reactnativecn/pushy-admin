import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Input, Radio, Select, Spin, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '@/services/admin-api';
import { api } from '@/services/api';
import type { App } from '@/types';
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
  sharePercent?: number;
}

type MetricAttribute = 'hash' | 'packageVersion_buildTime';

interface FormattedCategory {
  label: string;
  attribute?: MetricAttribute;
  isTotal: boolean;
}

const TOTAL_LABEL = '查询热更次数';
const CATEGORY_SEPARATOR = '\u001f';

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

type MetricsAppOptionSource = {
  id: number;
  name: string;
  platform: App['platform'];
  appKey?: string | null;
  checkCount?: number;
};

const formatCheckCount = (checkCount?: number) =>
  `${(checkCount ?? 0).toLocaleString()} 次检查`;

const formatAppOptionLabel = (app: MetricsAppOptionSource) => (
  <span className="flex min-w-0 items-center justify-between gap-3">
    <span className="truncate">{app.name}</span>
    <span className="shrink-0 text-gray-500 text-xs tabular-nums">
      {formatCheckCount(app.checkCount)}
    </span>
  </span>
);

const formatTooltipItem = (point: ChartDataPoint) => {
  const countLabel = `${point.value.toLocaleString()} 次`;
  if (point.isTotal || point.sharePercent === undefined) {
    return countLabel;
  }
  return `${countLabel} (${point.sharePercent.toFixed(1)}%)`;
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
  const { data: adminAppsData, isLoading: isLoadingAdminApps } = useQuery({
    queryKey: ['adminApps', 'realtimeMetricsDropdown'],
    queryFn: () => adminApi.searchApps({ limit: 1000 }),
    enabled: isAdmin,
  });
  const urlAppKey = searchParams.get('appKey') || undefined;
  const selectedAttribute: MetricAttribute =
    searchParams.get('attribute') === 'packageVersion_buildTime'
      ? 'packageVersion_buildTime'
      : 'hash';

  const selectableApps = useMemo<MetricsAppOptionSource[]>(() => {
    return isAdmin ? (adminAppsData?.data ?? []) : (apps ?? []);
  }, [adminAppsData?.data, apps, isAdmin]);
  const totalAppCount = isAdmin
    ? (adminAppsData?.count ?? selectableApps.length)
    : selectableApps.length;

  const appOptions = useMemo(() => {
    return selectableApps.reduce<
      { label: ReactNode; value: string; searchText: string }[]
    >((acc, app) => {
      if (app.appKey) {
        acc.push({
          label: formatAppOptionLabel(app),
          value: app.appKey as string,
          searchText: `${app.name} ${app.appKey} ${app.platform} ${app.id}`,
        });
      }
      return acc;
    }, []);
  }, [selectableApps]);
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
                optionFilterProp="searchText"
                value={selectedAppKey}
                onChange={handleAppChange}
                options={appOptions}
                loading={isAdmin && isLoadingAdminApps}
                style={{ width: '100%' }}
              />
            </div>
            <div className="text-xs text-gray-500">
              共 {totalAppCount.toLocaleString()} 个应用
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
