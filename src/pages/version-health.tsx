import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Spin, Table, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { AsyncLine } from '@/components/lazy-chart';
import { RANGE_PRESET_LABEL_KEY } from '@/constants/i18n-keys';
import { appViewPath, rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { buildTimeSeriesLineConfig, getRangePresets } from '@/utils/charts';
import { formatPercent } from '@/utils/format';
import { rememberRecentApp } from '@/utils/helper';
import { useWorkspacePermissions } from '@/utils/hooks';
import { metricsKeys } from '@/utils/query-keys';
import { useSelectedAppFromUrl } from '@/utils/selected-app';
import { useThemeMode } from '@/utils/theme-mode';
import {
  buildVersionHealth,
  EVENT_TYPES,
  type EventType,
  FAIL_TYPES,
  type VersionHealthRow,
} from './version-health.logic';
import { VersionHealthErrors } from './version-health-errors';

const { RangePicker } = DatePicker;

export const Component = () => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const { canManageApp } = useWorkspacePermissions();

  const {
    selectableApps,
    isLoadingApps,
    selectedAppKey,
    selectedApp,
    selectApp,
  } = useSelectedAppFromUrl();

  const { data, isLoading } = useQuery({
    queryKey: metricsKeys.appEvents(
      selectedAppKey,
      dateRange[0].toISOString(),
      dateRange[1].toISOString(),
    ),
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

  const { rows, trendData } = useMemo(
    () => buildVersionHealth(data, eventTypeLabels),
    [data, eventTypeLabels],
  );

  // 事件类型只有五条线，tooltip 不合并、图例不做默认筛选
  const lineConfig = buildTimeSeriesLineConfig({
    data: trendData,
    isDark,
    height: 360,
    sharedTooltip: false,
  });

  const columns = [
    {
      title: t('version_health.column_version'),
      dataIndex: 'version',
      key: 'version',
      ellipsis: true,
      width: 140,
    },
    {
      title: t('version_health.column_package_version'),
      dataIndex: 'packageVersion',
      key: 'packageVersion',
      ellipsis: true,
      width: 140,
      render: (packageVersion: string) =>
        packageVersion === 'unknown'
          ? t('version_health.unknown_package_version')
          : packageVersion,
    },
    ...EVENT_TYPES.map((type) => ({
      title: eventTypeLabels[type],
      key: type,
      align: 'right' as const,
      width: 110,
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
      width: 120,
      render: (_: unknown, row: VersionHealthRow) => {
        const label = formatPercent(row.rollbackRate);
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
      width: 130,
      render: (_: unknown, row: VersionHealthRow) =>
        formatPercent(row.downloadFailRate),
    },
  ];

  return (
    <AppDrawerLayout
      apps={selectableApps}
      currentAppKey={selectedAppKey}
      isLoading={isLoadingApps}
      onSelect={selectApp}
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
          router.navigate(
            appViewPath(rootRouterPath.realtimeMetrics, selectedAppKey),
          );
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
              presets={getRangePresets(
                t,
                RANGE_PRESET_LABEL_KEY.version_health,
              )}
            />
          </div>
          <div className="text-xs text-gray-400">
            {t('version_health.window_hint')} ·{' '}
            {t('version_health.sdk_requirement_title')}
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
                  rowKey={(row) => `${row.version}:${row.packageVersion}`}
                  columns={columns}
                  dataSource={rows}
                  pagination={false}
                  locale={{ emptyText: t('version_health.no_data') }}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
              <Card title={t('version_health.trend_title')} size="small">
                {trendData.length > 0 ? (
                  <AsyncLine {...lineConfig} />
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-400">
                    {t('version_health.no_data')}
                  </div>
                )}
              </Card>
              <VersionHealthErrors
                key={`${selectedApp?.id}:${dateRange[0].valueOf()}:${dateRange[1].valueOf()}`}
                appId={selectedApp?.id}
                start={dateRange[0].toISOString()}
                end={dateRange[1].toISOString()}
              />
            </>
          )}
        </Spin>
      </Card>
    </AppDrawerLayout>
  );
};
