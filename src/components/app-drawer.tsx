import {
  AppstoreOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Empty, Grid, Input, Radio, Tag } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  cn,
  getManageAppDrawerCollapsed,
  getManageAppDrawerPlacement,
  type ManageAppDrawerPlacement,
  manageAppDrawerCollapsedChangeEvent,
  manageAppDrawerPlacementChangeEvent,
  setManageAppDrawerCollapsed,
  setManageAppDrawerPlacement,
} from '@/utils/helper';
import { useAppList, useUserInfo } from '@/utils/hooks';
import PlatformIcon from './platform-icon';

export interface AppDrawerItem {
  id: number;
  name: string;
  platform: 'android' | 'ios' | 'harmony';
  status?: string | null;
  appKey?: string | null;
  checkCount?: number;
  downloadUrl?: string | null;
  ignoreBuildTime?: 'enabled' | 'disabled' | null;
}

export function useAppWorkspaceList(): {
  apps: AppDrawerItem[];
  isAdmin: boolean;
  isLoading: boolean;
  totalAppCount: number;
} {
  const { apps: userApps, isLoading: isLoadingUserApps } = useAppList();
  const { user } = useUserInfo();
  const isAdmin = user?.admin === true;

  const apps: AppDrawerItem[] = userApps ?? [];
  return {
    apps,
    isAdmin,
    isLoading: isLoadingUserApps,
    totalAppCount: apps.length,
  };
}

export function AppDrawer({
  apps,
  collapsed,
  currentAppId,
  currentAppKey,
  isLoading,
  onCollapsedChange,
  onPlacementChange,
  onSelect,
  onSettings,
  placement,
}: {
  apps: AppDrawerItem[];
  collapsed: boolean;
  currentAppId?: number;
  currentAppKey?: string;
  isLoading?: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onPlacementChange: (placement: ManageAppDrawerPlacement) => void;
  onSelect: (app: AppDrawerItem) => void;
  onSettings?: (app: AppDrawerItem) => void;
  placement: Exclude<ManageAppDrawerPlacement, 'hidden'>;
}) {
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

  const ToggleIcon = collapsed
    ? placement === 'right'
      ? LeftOutlined
      : RightOutlined
    : placement === 'right'
      ? RightOutlined
      : LeftOutlined;

  const isActive = (app: AppDrawerItem) => {
    if (currentAppKey && app.appKey) {
      return app.appKey === currentAppKey;
    }
    return app.id === currentAppId;
  };

  return (
    <div
      className={cn(
        'sticky top-6 h-[calc(100dvh-112px)] max-h-[calc(100dvh-112px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        collapsed ? 'w-16' : 'w-[280px]',
      )}
    >
      <div className="flex h-full flex-col">
        <button
          aria-label={collapsed ? '展开应用列表' : '收起应用列表'}
          className={cn(
            'flex w-full items-center border-0 border-slate-100 border-b bg-transparent text-left transition-colors hover:bg-slate-50',
            collapsed ? 'h-14 justify-center' : 'justify-between p-3',
          )}
          onClick={() => onCollapsedChange(!collapsed)}
          title={collapsed ? '展开应用列表' : '收起应用列表'}
          type="button"
        >
          {collapsed ? (
            <ToggleIcon className="text-slate-500" />
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <AppstoreOutlined className="text-slate-500" />
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">应用列表</div>
                  <div className="text-slate-500 text-xs">
                    共 {apps.length.toLocaleString()} 个应用
                  </div>
                </div>
              </div>
              <ToggleIcon className="shrink-0 text-slate-500" />
            </>
          )}
        </button>

        {!collapsed && (
          <>
            <div className="border-slate-100 border-b px-3 py-3">
              <Radio.Group
                buttonStyle="solid"
                onChange={(event) => {
                  onPlacementChange(
                    event.target.value as ManageAppDrawerPlacement,
                  );
                }}
                optionType="button"
                size="small"
                value={placement}
              >
                <Radio.Button value="left">左侧</Radio.Button>
                <Radio.Button value="right">右侧</Radio.Button>
                <Radio.Button value="hidden">隐藏</Radio.Button>
              </Radio.Group>
            </div>
            <div className="border-slate-100 border-b p-3">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索应用"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {collapsed ? (
            <div className="space-y-1">
              {apps.map((app) => (
                <AppIconButton
                  app={app}
                  isActive={isActive(app)}
                  key={app.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="space-y-1.5">
              {filteredApps.map((app) => (
                <AppDrawerRow
                  app={app}
                  isActive={isActive(app)}
                  key={app.id}
                  onSelect={onSelect}
                  onSettings={onSettings}
                />
              ))}
            </div>
          ) : (
            !isLoading && (
              <Empty
                className="my-8"
                description="没有匹配的应用"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function AppDrawerLayout({
  apps,
  children,
  className,
  contentClassName = 'min-w-0 flex-1',
  currentAppId,
  currentAppKey,
  isLoading,
  onSelect,
  onSettings,
}: {
  apps: AppDrawerItem[];
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  currentAppId?: number;
  currentAppKey?: string;
  isLoading?: boolean;
  onSelect: (app: AppDrawerItem) => void;
  onSettings?: (app: AppDrawerItem) => void;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [appDrawerPlacement, setAppDrawerPlacementState] =
    useState<ManageAppDrawerPlacement>(getManageAppDrawerPlacement);
  const [isAppDrawerCollapsed, setIsAppDrawerCollapsedState] = useState(
    getManageAppDrawerCollapsed,
  );

  useEffect(() => {
    const syncDrawerState = () => {
      setAppDrawerPlacementState(getManageAppDrawerPlacement());
      setIsAppDrawerCollapsedState(getManageAppDrawerCollapsed());
    };

    window.addEventListener(
      manageAppDrawerPlacementChangeEvent,
      syncDrawerState,
    );
    window.addEventListener(
      manageAppDrawerCollapsedChangeEvent,
      syncDrawerState,
    );
    window.addEventListener('storage', syncDrawerState);
    return () => {
      window.removeEventListener(
        manageAppDrawerPlacementChangeEvent,
        syncDrawerState,
      );
      window.removeEventListener(
        manageAppDrawerCollapsedChangeEvent,
        syncDrawerState,
      );
      window.removeEventListener('storage', syncDrawerState);
    };
  }, []);

  const handleAppDrawerPlacementChange = (
    placement: ManageAppDrawerPlacement,
  ) => {
    setAppDrawerPlacementState(placement);
    setManageAppDrawerPlacement(placement);
  };

  const handleAppDrawerCollapsedChange = (collapsed: boolean) => {
    setIsAppDrawerCollapsedState(collapsed);
    setManageAppDrawerCollapsed(collapsed);
  };

  const content = <div className={contentClassName}>{children}</div>;

  if (isMobile || appDrawerPlacement === 'hidden') {
    return className ? <div className={className}>{content}</div> : content;
  }

  const appDrawer = (
    <AppDrawer
      apps={apps}
      collapsed={isAppDrawerCollapsed}
      currentAppId={currentAppId}
      currentAppKey={currentAppKey}
      isLoading={isLoading}
      onCollapsedChange={handleAppDrawerCollapsedChange}
      onPlacementChange={handleAppDrawerPlacementChange}
      onSelect={onSelect}
      onSettings={onSettings}
      placement={appDrawerPlacement}
    />
  );

  const appDrawerWidth = isAppDrawerCollapsed ? '64px' : '280px';

  const grid = (
    <div
      className="grid items-start gap-4"
      style={{
        gridTemplateColumns:
          appDrawerPlacement === 'left'
            ? `${appDrawerWidth} minmax(0, 1fr)`
            : `minmax(0, 1fr) ${appDrawerWidth}`,
      }}
    >
      {appDrawerPlacement === 'left' && appDrawer}
      {content}
      {appDrawerPlacement === 'right' && appDrawer}
    </div>
  );

  return className ? <div className={className}>{grid}</div> : grid;
}

function AppIconButton({
  app,
  isActive,
  onSelect,
}: {
  app: AppDrawerItem;
  isActive: boolean;
  onSelect: (app: AppDrawerItem) => void;
}) {
  return (
    <button
      className={cn(
        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent transition-colors hover:bg-slate-100',
        isActive ? 'bg-blue-600 text-white hover:bg-blue-600' : undefined,
      )}
      onClick={() => onSelect(app)}
      title={`${app.name} · ${formatCheckCount(app)}`}
      type="button"
    >
      <PlatformIcon platform={app.platform} />
    </button>
  );
}

function AppDrawerRow({
  app,
  isActive,
  onSelect,
  onSettings,
}: {
  app: AppDrawerItem;
  isActive: boolean;
  onSelect: (app: AppDrawerItem) => void;
  onSettings?: (app: AppDrawerItem) => void;
}) {
  return (
    <div
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex w-full cursor-pointer items-center rounded-lg border-0 bg-transparent text-left transition-colors hover:bg-slate-50',
        isActive ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : undefined,
      )}
    >
      {isActive && (
        <span className="absolute top-1/2 left-2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600" />
      )}
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent py-2.5 pr-2 pl-5 text-left text-inherit"
        onClick={() => onSelect(app)}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <PlatformIcon platform={app.platform} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'truncate font-medium text-sm',
                isActive ? 'font-semibold text-[15px]' : undefined,
              )}
            >
              {app.name}
            </span>
            {app.status === 'paused' && (
              <Tag className="m-0 shrink-0">暂停</Tag>
            )}
          </span>
          <span
            className={cn(
              'block truncate text-xs',
              isActive ? 'text-blue-700' : 'text-slate-500',
            )}
          >
            {formatCheckCount(app)}
          </span>
        </span>
      </button>
      {onSettings && (
        <button
          aria-label={`打开 ${app.name} 应用设置`}
          className={cn(
            'mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-400 opacity-0 transition-all hover:bg-white/80 hover:text-blue-600 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100',
            isActive ? 'text-blue-600 hover:bg-blue-50' : undefined,
          )}
          onClick={() => onSettings(app)}
          title="应用设置"
          type="button"
        >
          <SettingOutlined />
        </button>
      )}
    </div>
  );
}

function formatCheckCount(app: AppDrawerItem) {
  return `${(app.checkCount ?? 0).toLocaleString()} 次检查`;
}
