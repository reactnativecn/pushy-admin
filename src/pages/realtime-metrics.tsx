import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Input, Radio, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout, useAppWorkspaceList } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { patchSearchParams, rememberRecentApp } from '@/utils/helper';
import { useThemeMode } from '@/utils/theme-mode';

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

const CATEGORY_SEPARATOR = '\u001f';

type ChartController = {
  emit: (...args: unknown[]) => unknown;
  on: (...args: unknown[]) => unknown;
};

const formatCategory = (
  rawCategory: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): FormattedCategory => {
  const totalLabel = t('realtime_metrics.update_checks');
  if (!rawCategory) {
    return { label: t('realtime_metrics.unknown'), isTotal: false };
  }
  if (rawCategory === '_total' || rawCategory === 'total') {
    return { label: totalLabel, isTotal: true };
  }
  const parts = rawCategory.split(CATEGORY_SEPARATOR);
  if (parts.length >= 2) {
    const key = parts[0];
    let value = parts.slice(1).join();
    if (!value || value === 'unknown') {
      value = t('realtime_metrics.none');
    }
    if (key === 'hash') {
      return {
        label: `${t('realtime_metrics.bundle_prefix')} ${value}`,
        attribute: 'hash',
        isTotal: false,
      };
    }
    if (key === 'packageVersion_buildTime') {
      return {
        label: `${t('realtime_metrics.package_prefix')} ${value}`,
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
      label: rawCategory.replace(
        CATEGORY_SEPARATOR,
        `: ${t('realtime_metrics.none')}`,
      ),
      isTotal: false,
    };
  }
  return {
    label: rawCategory.replace(CATEGORY_SEPARATOR, ': '),
    isTotal: false,
  };
};

const getAttributeOptions = (t: (key: string) => string) => [
  { label: t('realtime_metrics.bundle'), value: 'hash' as const },
  {
    label: t('realtime_metrics.package'),
    value: 'packageVersion_buildTime' as const,
  },
];

const formatTooltipItem = (
  point: ChartDataPoint,
  t: (key: string, opts?: Record<string, unknown>) => string,
) => {
  const count = point.value.toLocaleString();
  if (point.isTotal || point.sharePercent === undefined) {
    return t('realtime_metrics.tooltip_count', { count });
  }
  return t('realtime_metrics.tooltip_count_percent', {
    count,
    percent: point.sharePercent.toFixed(1),
  });
};

export const Component = () => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const [searchParams, setSearchParams] = useSearchParams({
    attribute: 'hash',
  });
  // 时间窗可由入口链接指定（如原生包时间戳告警按 7 天窗口计算，
  // 跳转过来必须用同样的窗口才能查到对应数据），默认过去 24 小时
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => {
    const rangeHours: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
    };
    const hours = rangeHours[searchParams.get('range') ?? ''] ?? 24;
    return [dayjs().subtract(hours, 'hour'), dayjs()];
  });
  const [manualAppKey, setManualAppKey] = useState('');
  const legendValuesRef = useRef<string[]>([]);
  const { contextHolder, openAppSettings } = useAppSettingsModal();

  const {
    apps: selectableApps,
    isAdmin,
    isLoading: isLoadingApps,
  } = useAppWorkspaceList();
  const urlAppKey = searchParams.get('appKey') || undefined;
  const selectedAttribute: MetricAttribute =
    searchParams.get('attribute') === 'packageVersion_buildTime'
      ? 'packageVersion_buildTime'
      : 'hash';

  const attributeOptions = getAttributeOptions(t);
  const totalLabel = t('realtime_metrics.update_checks');

  const selectableAppKeys = useMemo(
    () =>
      selectableApps
        .map((app) => app.appKey)
        .filter((appKey): appKey is string => Boolean(appKey)),
    [selectableApps],
  );
  const selectedAppKey = useMemo(() => {
    if (!urlAppKey) {
      return undefined;
    }
    if (isAdmin || selectableAppKeys.includes(urlAppKey)) {
      return urlAppKey;
    }
    return undefined;
  }, [isAdmin, selectableAppKeys, urlAppKey]);
  const selectedApp = useMemo(() => {
    if (!selectedAppKey) {
      return undefined;
    }
    return selectableApps.find((app) => app.appKey === selectedAppKey);
  }, [selectableApps, selectedAppKey]);

  // Default to first app if no selection
  useEffect(() => {
    if (!urlAppKey && selectableAppKeys.length > 0) {
      patchSearchParams(setSearchParams, {
        appKey: selectableAppKeys[0],
      });
    }
  }, [selectableAppKeys, setSearchParams, urlAppKey]);

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
        const { label, attribute, isTotal } = formatCategory(rawCategory, t);
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
  }, [data, t]);

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
  }, [selectedAttribute, attributeOptions]);

  // 入口链接标记的类别（原生包时间戳告警的跳转）强制加入默认图例，
  // 不受 Top 10 截断影响——它们通常量很小,否则点进来什么都看不到
  const focusLabels = useMemo(() => {
    const focusParam = searchParams.get('focus') ?? '';
    return focusParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => `${t('realtime_metrics.package_prefix')} ${value}`);
  }, [searchParams, t]);

  const defaultLegendValues = useMemo(() => {
    const topTen = sortedCategories.slice(0, 10);
    const focusExtras = focusLabels.filter(
      (label) => categoryTotals.has(label) && !topTen.includes(label),
    );
    const selection = [...topTen, ...focusExtras];
    if (!hasTotal) return selection;
    return [totalLabel, ...selection];
  }, [sortedCategories, categoryTotals, focusLabels, hasTotal, totalLabel]);

  const colorDomain = useMemo(() => {
    if (hasTotal) {
      return [totalLabel, ...sortedCategories];
    }
    return sortedCategories;
  }, [sortedCategories, hasTotal, totalLabel]);

  legendValuesRef.current = defaultLegendValues;

  const lineConfig = {
    theme: isDark ? 'classicDark' : 'classic',
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
        title: t('realtime_metrics.time'),
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
          value: formatTooltipItem(point, t),
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
    <AppDrawerLayout
      apps={selectableApps}
      currentAppKey={selectedAppKey}
      isLoading={isLoadingApps}
      onSelect={(app) => {
        if (!app.appKey) {
          return;
        }
        rememberRecentApp(app.id);
        patchSearchParams(setSearchParams, { appKey: app.appKey });
      }}
      onSettings={openAppSettings}
    >
      {contextHolder}
      <AppDetailHeader
        activeView="metrics"
        app={selectedApp}
        appNameFallback={selectedAppKey || t('realtime_metrics.select_app')}
        managementDisabled={!selectedApp}
        onManagementClick={() => {
          if (!selectedApp) {
            return;
          }
          rememberRecentApp(selectedApp.id);
          router.navigate(rootRouterPath.versions(String(selectedApp.id)));
        }}
        onSettingsClick={
          selectedApp ? () => openAppSettings(selectedApp) : undefined
        }
        sectionLabel={t('realtime_metrics.title')}
      />
      <Card>
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
                  placeholder={t('realtime_metrics.admin_placeholder')}
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
                    label: t('realtime_metrics.range_1h'),
                    value: [dayjs().subtract(1, 'hour'), dayjs()],
                  },
                  {
                    label: t('realtime_metrics.range_6h'),
                    value: [dayjs().subtract(6, 'hour'), dayjs()],
                  },
                  {
                    label: t('realtime_metrics.range_24h'),
                    value: [dayjs().subtract(24, 'hour'), dayjs()],
                  },
                  {
                    label: t('realtime_metrics.range_7d'),
                    value: [dayjs().subtract(7, 'day'), dayjs()],
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <Spin spinning={isLoading}>
          <Card
            title={t('realtime_metrics.request_overview')}
            size="small"
            style={{ marginBottom: 16 }}
          >
            {!selectedAppKey ? (
              <div className="h-20 flex items-center justify-center text-gray-400">
                {t('realtime_metrics.please_select_app')}
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                  <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="text-xs text-gray-500">
                      {t('realtime_metrics.total_requests')}
                    </div>
                    <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                      {isLoading ? '-' : totalRequests.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {dateRangeLabel}
                    </div>
                  </div>
                  <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="text-xs text-gray-500">
                      {t('realtime_metrics.category_count')}
                    </div>
                    <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                      {categoryTotals.size}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {t('realtime_metrics.current_dimension_label', {
                        dimension: selectedAttributeLabel,
                      })}
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
                            className="min-w-0 rounded border border-gray-200 bg-container px-3 py-2.5"
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
                                className="h-full rounded bg-primary"
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
                    {t('realtime_metrics.no_top_data')}
                  </div>
                )}
              </div>
            )}
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            {!selectedAppKey ? (
              <div className="h-80 flex items-center justify-center text-gray-400">
                {t('realtime_metrics.please_select_app')}
              </div>
            ) : filteredChartData.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                {t('realtime_metrics.no_data')}
              </div>
            )}
          </Card>
        </Spin>
      </Card>
    </AppDrawerLayout>
  );
};
