import { useQuery } from '@tanstack/react-query';
import {
  Card,
  DatePicker,
  Radio,
  Select,
  Spin,
  Statistic,
  Tabs,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AsyncLine } from '@/components/lazy-chart';
import { RANGE_PRESET_LABEL_KEY } from '@/constants/i18n-keys';
import { adminApi } from '@/services/admin-api';
import { api } from '@/services/api';
import { buildTimeSeriesLineConfig, getRangePresets } from '@/utils/charts';
import { patchSearchParams } from '@/utils/helper';
import {
  aggregateSeries,
  attachSharePercent,
  buildLegendDefaults,
  buildTotalSeries,
} from '@/utils/metrics';
import { metricsKeys } from '@/utils/query-keys';
import { useThemeMode } from '@/utils/theme-mode';
import {
  buildChartPoints,
  buildDistributionPoints,
  createDefaultDateRange,
  type DailyDistributionRow,
  type DistributionPoint,
  formatDistributionTooltip,
  formatTooltipItem,
  getCategoryPrefix,
  getMetricsTotal,
  getModeLabels,
  type MetricMode,
  metricKeyOptions,
  parseDateRange,
  parseKeyPrefix,
  parseMetricsTab,
  parseMode,
  TOTAL_SERIES_LABEL,
} from './admin-metrics.logic';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const DISTRIBUTION_DAYS = 30;

const DistributionPanel = ({
  rows,
  loading,
}: {
  rows: DailyDistributionRow[] | undefined;
  loading: boolean;
}) => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const legendValuesRef = useRef<string[]>([]);
  const points = useMemo(() => buildDistributionPoints(rows), [rows]);
  const { sortedCategories } = useMemo(() => aggregateSeries(points), [points]);
  const { defaultLegendValues, colorDomain } = useMemo(
    () => buildLegendDefaults(sortedCategories),
    [sortedCategories],
  );
  legendValuesRef.current = defaultLegendValues;

  const lineConfig = buildTimeSeriesLineConfig<DistributionPoint>({
    data: points,
    isDark,
    height: 480,
    xTitle: t('admin_metrics.time'),
    yTitle: t('admin_metrics.share_percent'),
    axisTimeFormat: 'MM/DD',
    formatTooltipValue: formatDistributionTooltip,
    colorDomain,
    legendValuesRef,
  });

  return (
    <Spin spinning={loading}>
      <div className="mb-4 text-sm text-gray-500">
        {t('admin_metrics.distribution_hint')}
      </div>
      <Card size="small">
        {points.length > 0 ? (
          <AsyncLine {...lineConfig} />
        ) : (
          <div className="flex h-80 items-center justify-center text-gray-400">
            {t('admin_metrics.no_data')}
          </div>
        )}
      </Card>
    </Spin>
  );
};

export const Component = () => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const legendValuesRef = useRef<string[]>([]);
  const defaultRangeRef = useRef<[Dayjs, Dayjs] | null>(null);
  defaultRangeRef.current ??= createDefaultDateRange();

  const activeTab = parseMetricsTab(searchParams.get('tab'));
  const mode = parseMode(searchParams.get('mode'));
  const selectedKeyPrefix = parseKeyPrefix(searchParams.get('prefix'));
  const [rangeStart, rangeEnd] = parseDateRange(
    searchParams,
    defaultRangeRef.current,
  );
  const startDate = rangeStart.toISOString();
  const endDate = rangeEnd.toISOString();
  const modeLabels = getModeLabels(t);

  const { data: pvMetrics, isLoading: isLoadingPv } = useQuery({
    queryKey: metricsKeys.global(startDate, endDate, 'pv'),
    queryFn: () =>
      api.getGlobalMetrics({ start: startDate, end: endDate, mode: 'pv' }),
    enabled: activeTab === 'requests',
  });
  const { data: uvMetrics, isLoading: isLoadingUv } = useQuery({
    queryKey: metricsKeys.global(startDate, endDate, 'uv'),
    queryFn: () =>
      api.getGlobalMetrics({ start: startDate, end: endDate, mode: 'uv' }),
    enabled: activeTab === 'requests',
  });
  const customerRegions = useQuery({
    queryKey: metricsKeys.customerRegions(DISTRIBUTION_DAYS),
    queryFn: () => adminApi.getAnalyticsOverview(DISTRIBUTION_DAYS),
    enabled: activeTab === 'request-regions',
  });
  const writeRegions = useQuery({
    queryKey: metricsKeys.writeOperations('region', DISTRIBUTION_DAYS),
    queryFn: () =>
      adminApi.getWriteOperationAnalytics('region', DISTRIBUTION_DAYS),
    enabled: activeTab === 'write-regions',
  });
  const writeClients = useQuery({
    queryKey: metricsKeys.writeOperations('client', DISTRIBUTION_DAYS),
    queryFn: () =>
      adminApi.getWriteOperationAnalytics('client', DISTRIBUTION_DAYS),
    enabled: activeTab === 'write-clients',
  });
  const customerRegionRows = useMemo<DailyDistributionRow[]>(
    () =>
      (customerRegions.data?.data || []).map((day) => ({
        date: day.date,
        values: day.countries,
      })),
    [customerRegions.data],
  );

  const metricsData = mode === 'pv' ? pvMetrics : uvMetrics;
  const isChartLoading = mode === 'pv' ? isLoadingPv : isLoadingUv;
  const chartData = useMemo(() => buildChartPoints(metricsData), [metricsData]);
  const prefixFilteredChartData = useMemo(
    () =>
      attachSharePercent(
        chartData.filter(
          (point) => getCategoryPrefix(point.category) === selectedKeyPrefix,
        ),
      ),
    [chartData, selectedKeyPrefix],
  );
  const {
    sortedCategories,
    topCategories,
    total: displayTotal,
  } = useMemo(
    () => aggregateSeries(prefixFilteredChartData),
    [prefixFilteredChartData],
  );
  const totalSeriesData = useMemo(
    () => buildTotalSeries(prefixFilteredChartData, TOTAL_SERIES_LABEL),
    [prefixFilteredChartData],
  );
  const { defaultLegendValues, colorDomain } = useMemo(
    () =>
      buildLegendDefaults(sortedCategories, {
        totalLabel: totalSeriesData.length ? TOTAL_SERIES_LABEL : undefined,
      }),
    [sortedCategories, totalSeriesData],
  );
  const lineData = useMemo(
    () => [...prefixFilteredChartData, ...totalSeriesData],
    [prefixFilteredChartData, totalSeriesData],
  );
  legendValuesRef.current = defaultLegendValues;

  const totalPv = useMemo(() => getMetricsTotal(pvMetrics), [pvMetrics]);
  const totalUv = useMemo(() => getMetricsTotal(uvMetrics), [uvMetrics]);
  const lineConfig = buildTimeSeriesLineConfig({
    data: lineData,
    isDark,
    height: 480,
    xTitle: t('admin_metrics.time'),
    yTitle: modeLabels[mode],
    formatTooltipValue: formatTooltipItem,
    colorDomain,
    legendValuesRef,
  });

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    patchSearchParams(setSearchParams, {
      start: dates?.[0] ? dates[0].toISOString() : undefined,
      end: dates?.[1] ? dates[1].toISOString() : undefined,
    });
  };

  const requestOverview = (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
        <Radio.Group
          value={mode}
          onChange={(event) => {
            patchSearchParams(setSearchParams, {
              mode: event.target.value as MetricMode,
            });
          }}
          className="w-full md:w-auto"
        >
          <Radio.Button value="pv">
            {t('admin_metrics.mode_requests')}
          </Radio.Button>
          <Radio.Button value="uv">
            {t('admin_metrics.mode_users')}
          </Radio.Button>
        </Radio.Group>
        <Select
          placeholder={t('admin_metrics.key_prefix')}
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
          presets={getRangePresets(t, RANGE_PRESET_LABEL_KEY.admin_metrics)}
        />
      </div>

      <Spin spinning={isChartLoading}>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card size="small">
            <Statistic
              title={t('admin_metrics.total_requests')}
              value={isLoadingPv ? '-' : totalPv.toLocaleString()}
            />
          </Card>
          <Card size="small">
            <Statistic
              title={t('admin_metrics.total_users')}
              value={isLoadingUv ? '-' : totalUv.toLocaleString()}
            />
          </Card>
        </div>
        <Card size="small" style={{ marginBottom: 20 }}>
          {lineData.length > 0 ? (
            <AsyncLine {...lineConfig} />
          ) : (
            <div className="flex h-80 items-center justify-center text-gray-400">
              {t('admin_metrics.no_data')}
            </div>
          )}
        </Card>
        {topCategories.length > 0 && (
          <Card title={t('admin_metrics.category_breakdown')} size="small">
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
                  <div className="text-xs text-gray-500">
                    {t('admin_metrics.share')}{' '}
                    {displayTotal > 0
                      ? ((value / displayTotal) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Spin>
    </>
  );

  return (
    <div className="page-section">
      <Card>
        <div className="mb-4">
          <Title level={4} className="m-0!">
            {t('admin_metrics.title')}
          </Title>
          <div className="text-sm text-gray-500">
            {t('admin_metrics.description')}
          </div>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={(tab) => {
            patchSearchParams(setSearchParams, {
              tab: tab === 'requests' ? undefined : tab,
            });
          }}
          items={[
            {
              key: 'requests',
              label: t('admin_metrics.tab_requests'),
              children: requestOverview,
            },
            {
              key: 'request-regions',
              label: t('admin_metrics.tab_request_regions'),
              children: (
                <DistributionPanel
                  rows={customerRegionRows}
                  loading={customerRegions.isLoading}
                />
              ),
            },
            {
              key: 'write-regions',
              label: t('admin_metrics.tab_write_regions'),
              children: (
                <DistributionPanel
                  rows={writeRegions.data?.data}
                  loading={writeRegions.isLoading}
                />
              ),
            },
            {
              key: 'write-clients',
              label: t('admin_metrics.tab_write_clients'),
              children: (
                <DistributionPanel
                  rows={writeClients.data?.data}
                  loading={writeClients.isLoading}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
