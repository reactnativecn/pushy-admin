import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Spin, Table, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout, useAppWorkspaceList } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { patchSearchParams, rememberRecentApp } from '@/utils/helper';
import { useWorkspacePermissions } from '@/utils/hooks';
import { useThemeMode } from '@/utils/theme-mode';

const { RangePicker } = DatePicker;

const CATEGORY_SEPARATOR = '';

const EVENT_TYPES = [
  'download_success',
  'download_fail',
  'patch_fail',
  'rollback',
  'mark_success',
] as const;

type EventType = (typeof EVENT_TYPES)[number];

const FAIL_TYPES: ReadonlySet<EventType> = new Set([
  'download_fail',
  'patch_fail',
  'rollback',
]);

interface VersionHealthRow {
  version: string;
  counts: Record<EventType, number>;
  rollbackRate: number | null;
  downloadFailRate: number | null;
  total: number;
}

interface TrendPoint {
  time: string;
  value: number;
  category: string;
}

function parseEventCategory(raw: string): {
  type: EventType;
  version: string;
} | null {
  const index = raw.indexOf(CATEGORY_SEPARATOR);
  if (index < 0) {
    return null;
  }
  const type = raw.slice(0, index) as EventType;
  const version = raw.slice(index + 1);
  if (!EVENT_TYPES.includes(type) || !version) {
    return null;
  }
  return { type, version };
}

function formatRate(rate: number | null) {
  if (rate === null) {
    return '-';
  }
  return `${(rate * 100).toFixed(1)}%`;
}

export const Component = () => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const { canManageApp } = useWorkspacePermissions();

  const {
    apps: selectableApps,
    isAdmin,
    isLoading: isLoadingApps,
  } = useAppWorkspaceList();
  const urlAppKey = searchParams.get('appKey') || undefined;

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

  useEffect(() => {
    if (!urlAppKey && selectableAppKeys.length > 0) {
      patchSearchParams(setSearchParams, {
        appKey: selectableAppKeys[0],
      });
    }
  }, [selectableAppKeys, setSearchParams, urlAppKey]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'appEventsMetrics',
      selectedAppKey,
      dateRange[0].toISOString(),
      dateRange[1].toISOString(),
    ],
    queryFn: () =>
      api.getAppEventsMetrics({
        appKey: selectedAppKey!,
        start: dateRange[0].toISOString(),
        end: dateRange[1].toISOString(),
      }),
    enabled: !!selectedAppKey,
  });

  const eventTypeLabels = useMemo<Record<EventType, string>>(
    () => ({
      download_success: t('version_health.download_success'),
      download_fail: t('version_health.download_fail'),
      patch_fail: t('version_health.patch_fail'),
      rollback: t('version_health.rollback'),
      mark_success: t('version_health.mark_success'),
    }),
    [t],
  );

  const { rows, trendData } = useMemo(() => {
    const versionCounts = new Map<string, Record<EventType, number>>();
    const trendTotals = new Map<string, Map<EventType, number>>();
    if (data?.data && data.dict) {
      for (const bucket of data.data) {
        for (const [dictIndex, count] of bucket.data) {
          const parsed = parseEventCategory(data.dict[dictIndex] || '');
          if (!parsed) {
            continue;
          }
          let counts = versionCounts.get(parsed.version);
          if (!counts) {
            counts = {
              download_success: 0,
              download_fail: 0,
              patch_fail: 0,
              rollback: 0,
              mark_success: 0,
            };
            versionCounts.set(parsed.version, counts);
          }
          counts[parsed.type] += count;

          let bucketTotals = trendTotals.get(bucket.time);
          if (!bucketTotals) {
            bucketTotals = new Map();
            trendTotals.set(bucket.time, bucketTotals);
          }
          bucketTotals.set(
            parsed.type,
            (bucketTotals.get(parsed.type) || 0) + count,
          );
        }
      }
    }

    const healthRows: VersionHealthRow[] = [...versionCounts.entries()].map(
      ([version, counts]) => {
        const startSamples = counts.rollback + counts.mark_success;
        const downloadSamples = counts.download_fail + counts.download_success;
        return {
          version,
          counts,
          rollbackRate:
            startSamples > 0 ? counts.rollback / startSamples : null,
          downloadFailRate:
            downloadSamples > 0 ? counts.download_fail / downloadSamples : null,
          total: EVENT_TYPES.reduce((sum, type) => sum + counts[type], 0),
        };
      },
    );
    healthRows.sort(
      (a, b) =>
        (b.rollbackRate ?? -1) - (a.rollbackRate ?? -1) || b.total - a.total,
    );

    const points: TrendPoint[] = [];
    for (const [time, bucketTotals] of trendTotals) {
      for (const [type, value] of bucketTotals) {
        points.push({
          time,
          value,
          category: eventTypeLabels[type],
        });
      }
    }
    points.sort((a, b) => a.time.localeCompare(b.time));

    return { rows: healthRows, trendData: points };
  }, [data, eventTypeLabels]);

  const lineConfig = {
    theme: isDark ? 'classicDark' : 'classic',
    data: trendData,
    xField: (d: TrendPoint) => new Date(d.time),
    yField: 'value',
    colorField: 'category',
    shapeField: 'smooth',
    axis: {
      x: {
        labelAutoRotate: true,
        labelFormatter: (value: string) => {
          const parsed = dayjs(value);
          return parsed.isValid() ? parsed.format('MM/DD HH:mm') : value;
        },
      },
      y: {},
    },
    tooltip: {
      title: (point: TrendPoint) => dayjs(point.time).format('MM/DD HH:mm'),
    },
    legend: { position: 'top' },
    height: 360,
  };

  const columns = [
    {
      title: t('version_health.column_version'),
      dataIndex: 'version',
      key: 'version',
      ellipsis: true,
    },
    ...EVENT_TYPES.map((type) => ({
      title: eventTypeLabels[type],
      key: type,
      align: 'right' as const,
      render: (_: unknown, row: VersionHealthRow) => {
        const count = row.counts[type];
        if (count > 0 && FAIL_TYPES.has(type)) {
          return <span className="text-red-500">{count}</span>;
        }
        return count;
      },
    })),
    {
      title: t('version_health.column_rollback_rate'),
      key: 'rollbackRate',
      align: 'right' as const,
      render: (_: unknown, row: VersionHealthRow) => {
        const label = formatRate(row.rollbackRate);
        if (row.rollbackRate !== null && row.rollbackRate >= 0.5) {
          return <Tag color="error">{label}</Tag>;
        }
        if (row.rollbackRate !== null && row.rollbackRate >= 0.1) {
          return <Tag color="warning">{label}</Tag>;
        }
        return label;
      },
    },
    {
      title: t('version_health.column_download_fail_rate'),
      key: 'downloadFailRate',
      align: 'right' as const,
      render: (_: unknown, row: VersionHealthRow) =>
        formatRate(row.downloadFailRate),
    },
  ];

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
      onSettings={canManageApp ? openAppSettings : undefined}
    >
      {contextHolder}
      <AppDetailHeader
        activeView="health"
        app={selectedApp}
        appNameFallback={selectedAppKey || t('version_health.select_app')}
        managementDisabled={!selectedApp}
        onManagementClick={() => {
          if (!selectedApp) {
            return;
          }
          rememberRecentApp(selectedApp.id);
          router.navigate(rootRouterPath.versions(String(selectedApp.id)));
        }}
        onMetricsClick={() => {
          const query = selectedAppKey
            ? `?appKey=${encodeURIComponent(selectedAppKey)}`
            : '';
          router.navigate(`${rootRouterPath.realtimeMetrics}${query}`);
        }}
        onSettingsClick={
          selectedApp && canManageApp
            ? () => openAppSettings(selectedApp)
            : undefined
        }
        sectionLabel={t('version_health.title')}
      />
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="w-full xl:w-auto xl:min-w-[22rem]">
            <RangePicker
              showTime
              value={dateRange}
              onChange={(dates) => {
                if (dates?.[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              style={{ width: '100%' }}
              presets={[
                {
                  label: t('version_health.range_24h'),
                  value: [dayjs().subtract(24, 'hour'), dayjs()],
                },
                {
                  label: t('version_health.range_3d'),
                  value: [dayjs().subtract(3, 'day'), dayjs()],
                },
                {
                  label: t('version_health.range_7d'),
                  value: [dayjs().subtract(7, 'day'), dayjs()],
                },
              ]}
            />
          </div>
          <div className="text-xs text-gray-400">
            {t('version_health.window_hint')}
          </div>
        </div>

        <Spin spinning={isLoading}>
          {!selectedAppKey ? (
            <div className="h-40 flex items-center justify-center text-gray-400">
              {t('version_health.please_select_app')}
            </div>
          ) : (
            <>
              <Card
                title={t('version_health.table_title')}
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Table
                  size="small"
                  rowKey="version"
                  columns={columns}
                  dataSource={rows}
                  pagination={false}
                  locale={{ emptyText: t('version_health.no_data') }}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
              <Card title={t('version_health.trend_title')} size="small">
                {trendData.length > 0 ? (
                  <Line {...lineConfig} />
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-400">
                    {t('version_health.no_data')}
                  </div>
                )}
              </Card>
            </>
          )}
        </Spin>
      </Card>
    </AppDrawerLayout>
  );
};
