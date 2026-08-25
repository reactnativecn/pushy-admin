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

const { Title } = Typography;
const { RangePicker } = DatePicker;

type MetricMode = 'pv' | 'uv';
type MetricKeyPrefix = 'rn' | 'os' | 'rnu';

interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
  sharePercent?: number;
}

interface MetricsResponse {
  dict: string[];
  data: Array<{ time: string; data: Array<[number, number]> }>;
}

const TOTAL_SERIES_LABEL = 'total';
const DEFAULT_RANGE_HOURS = 24;

const getModeLabels = (
  t: (key: string) => string,
): Record<MetricMode, string> => ({
  pv: t('admin_metrics.mode_requests'),
  uv: t('admin_metrics.mode_users'),
});

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

const formatTooltipItem = (point: ChartDataPoint) => {
  const countLabel = point.value.toLocaleString();
  if (
    point.category === TOTAL_SERIES_LABEL ||
    point.sharePercent === undefined
  ) {
    return countLabel;
  }
  return `${countLabel} (${point.sharePercent.toFixed(1)}%)`;
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
