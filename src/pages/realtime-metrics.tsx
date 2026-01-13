import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  DatePicker,
  Input,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
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

const TOTAL_LABEL = '查询热更次数';
const CATEGORY_SEPARATOR = '\u001f';

const formatCategory = (rawCategory: string) => {
  if (!rawCategory) {
    return { label: 'unknown', isTotal: false };
  }
  if (rawCategory === '_total' || rawCategory === 'total') {
    return { label: TOTAL_LABEL, isTotal: true };
  }
  const parts = rawCategory.split(CATEGORY_SEPARATOR);
  if (parts.length >= 2) {
    const key = parts[0];
    const value = parts.slice(1).join(CATEGORY_SEPARATOR) || 'unknown';
    if (key === 'hash') {
      return { label: `热更包: ${value}`, attribute: 'hash', isTotal: false };
    }
    if (key === 'packageVersion_buildTime') {
      return {
        label: `原生包: ${value}`,
        attribute: 'packageVersion_buildTime',
        isTotal: false,
      };
    }
  }
  if (rawCategory.endsWith(CATEGORY_SEPARATOR)) {
    return {
      label: rawCategory.replace(CATEGORY_SEPARATOR, ': unknown'),
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
  const lastAppliedLegendRef = useRef('');

  const { apps } = useAppList();
  const { user } = useUserInfo();
  const isAdmin = user?.admin === true;

  const appOptions = useMemo(() => {
    return (apps || [])
      .filter((app) => !!app.appKey)
      .map((app) => ({
        label: app.name,
        value: app.appKey as string,
      }));
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

  useEffect(() => {
    lastAppliedLegendRef.current = '';
  }, [selectedAppKey, dateRange, selectedAttribute]);

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

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title level={4} className="m-0!">
            实时数据
          </Title>
          <Space>
            <Select
              placeholder="选择应用"
              showSearch
              optionFilterProp="label"
              value={selectedAppKey}
              onChange={handleAppChange}
              options={appOptions}
              style={{ width: 200 }}
            />
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
              <Input
                placeholder="输入任意 App Key"
                value={manualAppKey}
                onChange={(e) => setManualAppKey(e.target.value)}
                onPressEnter={handleManualAppKeySubmit}
                style={{ width: 180 }}
              />
            )}
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
              ]}
            />
          </Space>
        </div>

        <Spin spinning={isLoading}>
          <Card size="small" style={{ marginBottom: 20 }}>
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
