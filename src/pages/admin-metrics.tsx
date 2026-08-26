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
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AsyncLine } from '@/components/lazy-chart';
import { RANGE_PRESET_LABEL_KEY } from '@/constants/i18n-keys';
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
  createDefaultDateRange,
  formatTooltipItem,
  getCategoryPrefix,
  getMetricsTotal,
  getModeLabels,
  type MetricMode,
  metricKeyOptions,
  parseDateRange,
  parseKeyPrefix,
  parseMode,
  TOTAL_SERIES_LABEL,
} from './admin-metrics.logic';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export const Component = () => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
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

  const modeLabels = getModeLabels(t);

  const { data: pvMetrics, isLoading: isLoadingPv } = useQuery({
    queryKey: metricsKeys.global(startDate, endDate, 'pv'),
    queryFn: () =>
      api.getGlobalMetrics({
        start: startDate,
        end: endDate,
        mode: 'pv',
      }),
  });

  const { data: uvMetrics, isLoading: isLoadingUv } = useQuery({
    queryKey: metricsKeys.global(startDate, endDate, 'uv'),
    queryFn: () =>
      api.getGlobalMetrics({
        start: startDate,
        end: endDate,
        mode: 'uv',
      }),
  });

  const metricsData = mode === 'pv' ? pvMetrics : uvMetrics;
  const isChartLoading = mode === 'pv' ? isLoadingPv : isLoadingUv;

  const chartData = useMemo(() => buildChartPoints(metricsData), [metricsData]);

  // 全站指标没有服务端总量点，占比分母就是各类别在该时间桶内的求和
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

  // 总量线由各类别求和合成，随分类线一起画
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

  const lineData = useMemo(() => {
    if (!prefixFilteredChartData.length && !totalSeriesData.length) return [];
    return [...prefixFilteredChartData, ...totalSeriesData];
  }, [prefixFilteredChartData, totalSeriesData]);

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

  return (
    <div className="page-section">
      <Card>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="m-0!">
              {t('admin_metrics.title')}
            </Title>
            <div className="text-sm text-gray-500">
              {t('admin_metrics.description')}
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
      </Card>
    </div>
  );
};
