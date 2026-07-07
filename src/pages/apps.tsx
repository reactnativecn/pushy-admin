import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Input, Spin, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  type AppDrawerItem,
  AppDrawerLayout,
  useAppWorkspaceList,
} from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { showCreateAppModal } from '@/components/create-app-modal';
import PlatformIcon from '@/components/platform-icon';
import { rootRouterPath, router } from '@/router';
import { cn, rememberRecentApp } from '@/utils/helper';
import { useWorkspacePermissions } from '@/utils/hooks';

const { Title } = Typography;

type AppItem = AppDrawerItem;

const platformLabels: Record<AppItem['platform'], string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
};

const formatAppKey = (
  appKey: string | null | undefined,
  t: (key: string) => string,
) => {
  if (!appKey) {
    return t('apps.key_pending');
  }
  if (appKey.length <= 16) {
    return appKey;
  }
  return `${appKey.slice(0, 8)}...${appKey.slice(-6)}`;
};

export const Component = () => {
  const { t } = useTranslation();
  const { apps, isLoading } = useAppWorkspaceList();
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const { canManageApp } = useWorkspacePermissions();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const filteredApps = useMemo(() => {
    if (!normalizedQuery) {
      return apps;
    }
    return apps.filter((app) =>
      [app.name, app.appKey, app.platform]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [apps, normalizedQuery]);

  const pausedCount = useMemo(
    () => apps.filter((app) => app.status === 'paused').length,
    [apps],
  );
  const totalChecks = useMemo(
    () =>
      apps.reduce((sum, app) => {
        return sum + (app.checkCount ?? 0);
      }, 0),
    [apps],
  );

  const createApp = () => {
    showCreateAppModal({
      onCreated: (id) => {
        rememberRecentApp(id);
        return router.navigate(rootRouterPath.versions(String(id)));
      },
    });
  };

  const content = (
    <div className="min-w-0">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Title level={4} className="m-0!">
            {t('apps.title')}
          </Title>
          <div className="mt-1 text-gray-500">{t('apps.description')}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            allowClear
            className="w-full sm:w-72"
            prefix={<SearchOutlined />}
            placeholder={t('apps.search_placeholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {canManageApp && (
            <Button type="primary" icon={<PlusOutlined />} onClick={createApp}>
              {t('apps.create_app')}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label={t('apps.total_apps')}
          value={apps.length.toLocaleString()}
        />
        <MetricCard
          label={t('apps.paused_apps')}
          value={pausedCount.toLocaleString()}
        />
        <MetricCard
          label={t('apps.total_checks')}
          value={totalChecks.toLocaleString()}
        />
      </div>

      <Card className="shadow-sm">
        <Spin spinning={isLoading}>
          {filteredApps.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredApps.map((app) => (
                <AppCard app={app} key={app.id} />
              ))}
            </div>
          ) : (
            <Empty
              className="py-16"
              description={
                query ? t('apps.no_search_results') : t('apps.no_apps')
              }
            >
              {!query && canManageApp && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={createApp}
                >
                  {t('apps.create_first')}
                </Button>
              )}
            </Empty>
          )}
        </Spin>
      </Card>
    </div>
  );

  return (
    <AppDrawerLayout
      apps={apps}
      isLoading={isLoading}
      onSelect={(app) => {
        rememberRecentApp(app.id);
        router.navigate(rootRouterPath.versions(String(app.id)));
      }}
      onSettings={canManageApp ? openAppSettings : undefined}
    >
      {contextHolder}
      {content}
    </AppDrawerLayout>
  );
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-container px-4 py-3 shadow-sm">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="mt-1 font-semibold text-2xl text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function AppCard({ app }: { app: AppItem }) {
  const { t } = useTranslation();
  const appKeyLabel = formatAppKey(app.appKey, t);

  return (
    <Link
      className="group block h-full cursor-pointer no-underline"
      to={rootRouterPath.versions(String(app.id))}
      onClick={() => rememberRecentApp(app.id)}
    >
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-container p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <PlatformIcon platform={app.platform} className="text-xl!" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">
                {app.name}
              </div>
              <div className="mt-0.5 text-gray-500 text-xs">
                {platformLabels[app.platform]}
              </div>
            </div>
          </div>
          <Tag
            className="m-0 shrink-0"
            color={app.status === 'paused' ? 'orange' : 'green'}
          >
            {app.status === 'paused' ? t('apps.paused') : t('apps.active')}
          </Tag>
        </div>

        <div className="mt-auto space-y-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-gray-500 text-xs">App Key</div>
            <div
              className={cn(
                'mt-1 truncate font-mono text-xs',
                app.appKey ? 'text-slate-700' : 'text-gray-400',
              )}
              title={app.appKey || undefined}
            >
              {appKeyLabel}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('apps.checks')}</span>
            <span className="font-medium text-slate-800 tabular-nums">
              {(app.checkCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-1 text-primary text-xs opacity-0 transition-opacity group-hover:opacity-100">
            {t('apps.open_manage')}
          </div>
        </div>
      </div>
    </Link>
  );
}
