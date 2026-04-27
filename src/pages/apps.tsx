import {
  AppstoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Input, Spin, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { showCreateAppModal } from '@/components/create-app-modal';
import PlatformIcon from '@/components/platform-icon';
import { rootRouterPath, router } from '@/router';
import { cn, rememberRecentApp } from '@/utils/helper';
import { useAppList } from '@/utils/hooks';

const { Title } = Typography;

type AppItem = NonNullable<ReturnType<typeof useAppList>['apps']>[number];

const platformLabels: Record<AppItem['platform'], string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
};

const formatAppKey = (appKey?: string) => {
  if (!appKey) {
    return '尚未生成 App Key';
  }
  if (appKey.length <= 16) {
    return appKey;
  }
  return `${appKey.slice(0, 8)}...${appKey.slice(-6)}`;
};

export const Component = () => {
  const { apps: appList, isLoading } = useAppList();
  const [query, setQuery] = useState('');
  const apps = appList ?? [];
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

  return (
    <div className="page-section">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700 text-xs">
            <AppstoreOutlined />
            应用工作台
          </div>
          <Title level={3} className="m-0!">
            应用列表
          </Title>
          <div className="mt-1 text-gray-500">
            选择一个应用进入版本、原生包和发布配置管理。
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            allowClear
            className="w-full sm:w-72"
            prefix={<SearchOutlined />}
            placeholder="搜索应用名称、App Key 或平台"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={createApp}>
            添加应用
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="应用总数" value={apps.length.toLocaleString()} />
        <MetricCard label="暂停应用" value={pausedCount.toLocaleString()} />
        <MetricCard label="累计检查" value={totalChecks.toLocaleString()} />
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
              description={query ? '没有匹配的应用' : '还没有应用'}
            >
              {!query && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={createApp}
                >
                  添加第一个应用
                </Button>
              )}
            </Empty>
          )}
        </Spin>
      </Card>
    </div>
  );
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="mt-1 font-semibold text-2xl text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function AppCard({ app }: { app: AppItem }) {
  const appKeyLabel = formatAppKey(app.appKey);

  return (
    <Link
      className="group block h-full no-underline"
      to={rootRouterPath.versions(String(app.id))}
      onClick={() => rememberRecentApp(app.id)}
    >
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
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
            {app.status === 'paused' ? '暂停' : '正常'}
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
              title={app.appKey}
            >
              {appKeyLabel}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">检查次数</span>
            <span className="font-medium text-slate-800 tabular-nums">
              {(app.checkCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-1 text-blue-600 text-xs opacity-0 transition-opacity group-hover:opacity-100">
            进入应用管理
          </div>
        </div>
      </div>
    </Link>
  );
}
