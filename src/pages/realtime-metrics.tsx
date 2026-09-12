import { Card, Input, Radio, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { appViewPath, rootRouterPath, router } from '@/router';
import { patchSearchParams, rememberRecentApp } from '@/utils/helper';
import { useWorkspacePermissions } from '@/utils/hooks';
import { useSelectedAppFromUrl } from '@/utils/selected-app';
import { FailuresPanel } from './app-insights/failures-panel';
import {
  DEFAULT_INSIGHT_DAYS,
  INSIGHT_DAY_OPTIONS,
  INSIGHT_VIEWS,
  type InsightView,
  parseInsightDays,
  parseInsightView,
} from './app-insights/logic';
import { OverviewPanel } from './app-insights/overview-panel';
import { hasRealtimeSeriesEntryParams } from './app-insights/realtime-series-panel';
import { TrafficPanel } from './app-insights/traffic-panel';
import { VersionsPanel } from './app-insights/versions-panel';

// 数据分析页：概览 → 版本漏斗 → 流量画像 → 失败诊断 四层，视图和天数写进 URL。
// 应用选择沿用 ?appKey（管理员可填任意 App Key）。

const VIEW_LABEL_KEY: Record<InsightView, string> = {
  overview: 'app_insights.view_overview',
  versions: 'app_insights.view_versions',
  traffic: 'app_insights.view_traffic',
  failures: 'app_insights.view_failures',
};

export const Component = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const { canManageApp } = useWorkspacePermissions();
  const {
    selectableApps,
    isAdmin,
    isLoadingApps,
    selectedAppKey,
    selectedApp,
    selectApp,
  } = useSelectedAppFromUrl();

  // 原生包告警的入口链接只带 range / focus，没有 view：直接落到实时曲线所在的流量画像
  const view: InsightView = searchParams.has('view')
    ? parseInsightView(searchParams.get('view'))
    : hasRealtimeSeriesEntryParams(searchParams)
      ? 'traffic'
      : 'overview';
  const days = parseInsightDays(searchParams.get('days'));

  const setView = (next: InsightView) =>
    patchSearchParams(setSearchParams, {
      view: next === 'overview' ? undefined : next,
    });

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
        onHealthClick={() => {
          router.navigate(
            appViewPath(rootRouterPath.versionHealth, selectedAppKey),
          );
        }}
        onSettingsClick={
          selectedApp && canManageApp
            ? () => openAppSettings(selectedApp)
            : undefined
        }
        sectionLabel={t('realtime_metrics.title')}
      />
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <Segmented
            value={view}
            onChange={(value) => setView(value as InsightView)}
            options={INSIGHT_VIEWS.map((value) => ({
              value,
              label: t(VIEW_LABEL_KEY[value]),
            }))}
          />
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Input.Search
                className="w-full sm:w-56"
                placeholder={t('realtime_metrics.admin_placeholder')}
                allowClear
                onSearch={(value) => {
                  const appKey = value.trim();
                  if (appKey) {
                    patchSearchParams(setSearchParams, { appKey });
                  }
                }}
              />
            )}
            <Radio.Group
              value={days}
              onChange={(event) =>
                patchSearchParams(setSearchParams, {
                  days:
                    event.target.value === DEFAULT_INSIGHT_DAYS
                      ? undefined
                      : String(event.target.value),
                })
              }
              optionType="button"
              buttonStyle="solid"
            >
              {INSIGHT_DAY_OPTIONS.map((value) => (
                <Radio.Button key={value} value={value}>
                  {t('app_insights.days_option', { days: value })}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        </div>

        {!selectedAppKey ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            {t('realtime_metrics.please_select_app')}
          </div>
        ) : view === 'overview' ? (
          <OverviewPanel
            appKey={selectedAppKey}
            days={days}
            onNavigate={setView}
          />
        ) : view === 'versions' ? (
          <VersionsPanel appKey={selectedAppKey} days={days} />
        ) : view === 'traffic' ? (
          <TrafficPanel appKey={selectedAppKey} days={days} isAdmin={isAdmin} />
        ) : (
          <FailuresPanel appKey={selectedAppKey} days={days} />
        )}
        <div className="mt-4 text-xs text-gray-400">
          {t('app_insights.page_footnote')}
        </div>
      </Card>
    </AppDrawerLayout>
  );
};
