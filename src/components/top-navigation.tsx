import {
  AppstoreOutlined,
  CommentOutlined,
  DownOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LineChartOutlined,
  MenuOutlined,
  PlusOutlined,
  ReadOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Drawer, Empty, Input, Menu, Popover, Tag } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath, router } from '@/router';
import { cn, getRecentAppIds, rememberRecentApp } from '@/utils/helper';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { ReactComponent as LogoH } from '../assets/logo-h.svg';
import { showCreateAppModal } from './create-app-modal';
import { DailyCheckQuotaUserTrigger } from './daily-check-quota';
import PlatformIcon from './platform-icon';

type AppItem = NonNullable<ReturnType<typeof useAppList>['apps']>[number];

interface TopNavigationProps {
  isMobile: boolean;
  showAuthenticatedChrome: boolean;
}

type MenuItems = NonNullable<MenuProps['items']>;

const externalItems: MenuItems = [
  {
    key: 'issues',
    icon: <CommentOutlined />,
    label: (
      <ExtLink href="https://github.com/reactnativecn/react-native-pushy/issues">
        讨论
      </ExtLink>
    ),
  },
  {
    key: 'document',
    icon: <ReadOutlined />,
    label: (
      <ExtLink href="https://pushy.reactnative.cn/docs/getting-started.html">
        文档
      </ExtLink>
    ),
  },
  {
    key: 'about',
    icon: <InfoCircleOutlined />,
    label: <ExtLink href="https://reactnative.cn/about.html">关于我们</ExtLink>,
  },
];

const platformLabels: Record<AppItem['platform'], string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
};

export default function TopNavigation({
  isMobile,
  showAuthenticatedChrome,
}: TopNavigationProps) {
  const { user } = useUserInfo();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectedKeys = useMemo(() => getSelectedKeys(pathname), [pathname]);

  const authenticatedItems: MenuItems =
    showAuthenticatedChrome && user
      ? [
          {
            key: 'api-tokens',
            icon: <KeyOutlined />,
            label: <Link to={rootRouterPath.apiTokens}>API Token</Link>,
          },
          {
            key: 'audit-logs',
            icon: <FileTextOutlined />,
            label: <Link to={rootRouterPath.auditLogs}>操作日志</Link>,
          },
          {
            key: 'realtime-metrics',
            icon: <LineChartOutlined />,
            label: <Link to={rootRouterPath.realtimeMetrics}>实时数据</Link>,
          },
          ...(user.admin
            ? [
                {
                  key: 'admin',
                  icon: <SettingOutlined />,
                  label: '管理员',
                  children: [
                    {
                      key: 'admin-config',
                      label: (
                        <Link to={rootRouterPath.adminConfig}>动态配置</Link>
                      ),
                    },
                    {
                      key: 'admin-users',
                      label: (
                        <Link to={rootRouterPath.adminUsers}>用户管理</Link>
                      ),
                    },
                    {
                      key: 'admin-apps',
                      label: (
                        <Link to={rootRouterPath.adminApps}>应用管理</Link>
                      ),
                    },
                    {
                      key: 'admin-metrics',
                      label: (
                        <Link to={rootRouterPath.adminMetrics}>全局统计</Link>
                      ),
                    },
                  ],
                },
              ]
            : []),
        ]
      : [];

  const mobileItems: MenuItems = [
    ...authenticatedItems,
    ...(authenticatedItems.length ? [{ type: 'divider' as const }] : []),
    ...externalItems,
    ...(showAuthenticatedChrome && user
      ? [
          { type: 'divider' as const },
          {
            key: 'user',
            icon: <UserOutlined />,
            label: <Link to={rootRouterPath.user}>账户设置</Link>,
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-16 w-full min-w-0 items-center gap-1.5 md:gap-3">
      <Link to="/" className="flex shrink-0 items-center no-underline">
        <LogoH className="h-7 w-auto max-w-[88px] sm:max-w-[130px] md:max-w-[150px]" />
      </Link>
      {showAuthenticatedChrome && user && <AppSwitcher compact={isMobile} />}
      {isMobile ? (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {showAuthenticatedChrome && user && (
            <Link
              to={rootRouterPath.user}
              className="shrink-0 rounded-lg px-0.5 no-underline"
            >
              <DailyCheckQuotaUserTrigger compact userName={user.name} />
            </Link>
          )}
          <button
            aria-label="打开菜单"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-500',
              showAuthenticatedChrome && user ? undefined : 'ml-auto',
            )}
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <MenuOutlined className="text-base" />
          </button>
          <MobileMenuSheet
            items={mobileItems}
            onClose={() => setMobileMenuOpen(false)}
            open={mobileMenuOpen}
            selectedKeys={selectedKeys}
          />
        </div>
      ) : (
        <>
          <Menu
            className="min-w-0 flex-1 border-b-0!"
            mode="horizontal"
            selectedKeys={selectedKeys}
            items={[...authenticatedItems, ...externalItems]}
            style={{ height: 64, lineHeight: '64px' }}
          />
          {showAuthenticatedChrome && user && (
            <Link
              to={rootRouterPath.user}
              className="flex h-14 w-60 items-center rounded-xl px-2 text-slate-700 no-underline transition-colors hover:bg-slate-50"
            >
              <DailyCheckQuotaUserTrigger
                showPlanDetails
                userName={user.name}
              />
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function MobileMenuSheet({
  items,
  onClose,
  open,
  selectedKeys,
}: {
  items: MenuItems;
  onClose: () => void;
  open: boolean;
  selectedKeys: string[];
}) {
  return (
    <Drawer
      height="68vh"
      onClose={onClose}
      open={open}
      placement="bottom"
      title="菜单"
      styles={{ body: { padding: 8 } }}
    >
      <Menu
        className="border-e-0!"
        items={items}
        mode="inline"
        onClick={onClose}
        selectedKeys={selectedKeys}
      />
    </Drawer>
  );
}

function AppSwitcher({ compact }: { compact: boolean }) {
  const { apps: appList } = useAppList();
  const { pathname } = useLocation();
  const apps = appList ?? [];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentAppIds, setRecentAppIds] = useState(() => getRecentAppIds());
  const currentAppId = getCurrentAppId(pathname);
  const currentApp = apps.find((app) => app.id === currentAppId);
  const appMap = useMemo(() => {
    return new Map(apps.map((app) => [app.id, app]));
  }, [apps]);
  const recentApps = useMemo(() => {
    return recentAppIds
      .map((appId) => appMap.get(appId))
      .filter((app): app is AppItem => !!app);
  }, [appMap, recentAppIds]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredApps = apps.filter((app) => {
    if (!normalizedQuery) {
      return true;
    }
    return [app.name, app.appKey, app.platform]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });

  useEffect(() => {
    if (currentAppId) {
      setRecentAppIds(rememberRecentApp(currentAppId));
    }
  }, [currentAppId]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const navigateToApp = (appId: number) => {
    setRecentAppIds(rememberRecentApp(appId));
    setOpen(false);
    router.navigate(rootRouterPath.versions(String(appId)));
  };

  const createApp = () => {
    setOpen(false);
    showCreateAppModal({
      onCreated: (id) => {
        setRecentAppIds(rememberRecentApp(id));
        return router.navigate(rootRouterPath.versions(String(id)));
      },
    });
  };

  const triggerLabel = currentApp?.name ?? '选择应用';
  const content = (
    <AppSwitcherContent
      currentAppId={currentAppId}
      filteredApps={filteredApps}
      isSheet={compact}
      onCreateApp={createApp}
      onNavigateToApp={navigateToApp}
      query={query}
      recentApps={recentApps}
      setQuery={setQuery}
    />
  );
  const trigger = (
    <button
      className={cn(
        'flex h-16 min-w-0 items-center border-0 border-slate-200 border-x bg-slate-50 px-4 text-left transition-colors hover:bg-white',
        compact ? 'max-w-[150px] flex-1 px-2' : 'w-72 lg:w-80',
      )}
      onClick={compact ? () => setOpen(true) : undefined}
      aria-expanded={open}
      type="button"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {currentApp ? (
          <PlatformIcon platform={currentApp.platform} className="shrink-0" />
        ) : (
          <AppstoreOutlined className="shrink-0" />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate">{triggerLabel}</span>
          {currentApp?.status === 'paused' && (
            <Tag className="m-0 shrink-0">暂停</Tag>
          )}
        </span>
        <DownOutlined className="ml-auto shrink-0 text-xs" />
      </span>
    </button>
  );

  if (compact) {
    return (
      <>
        {trigger}
        <Drawer
          height="72vh"
          onClose={() => setOpen(false)}
          open={open}
          placement="bottom"
          title="选择应用"
          styles={{ body: { padding: 0 } }}
        >
          {content}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      arrow={false}
      content={content}
      mouseEnterDelay={0.08}
      mouseLeaveDelay={0.18}
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      trigger={['hover', 'click']}
    >
      {trigger}
    </Popover>
  );
}

interface AppSwitcherContentProps {
  currentAppId: number | null;
  filteredApps: AppItem[];
  isSheet?: boolean;
  onCreateApp: () => void;
  onNavigateToApp: (appId: number) => void;
  query: string;
  recentApps: AppItem[];
  setQuery: (query: string) => void;
}

function AppSwitcherContent({
  currentAppId,
  filteredApps,
  isSheet = false,
  onCreateApp,
  onNavigateToApp,
  query,
  recentApps,
  setQuery,
}: AppSwitcherContentProps) {
  const hasSearch = query.trim().length > 0;

  return (
    <div className={isSheet ? 'w-full' : 'w-[min(460px,calc(100vw-32px))]'}>
      <div className="border-gray-100 border-b p-3">
        <Input
          allowClear
          autoFocus
          prefix={<SearchOutlined />}
          placeholder="搜索应用名称、App Key 或平台"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {recentApps.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-gray-500">最近访问</span>
            {recentApps.map((app) => (
              <button
                className={cn(
                  'inline-flex max-w-[180px] items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 text-xs transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600',
                  app.id === currentAppId
                    ? 'border-blue-200 bg-blue-50 text-blue-600'
                    : undefined,
                )}
                key={app.id}
                onClick={() => onNavigateToApp(app.id)}
                type="button"
              >
                <PlatformIcon platform={app.platform} className="text-xs!" />
                <span className="truncate">{app.name}</span>
                {app.status === 'paused' && (
                  <span className="shrink-0 text-[10px] text-gray-400">
                    暂停
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-2 py-2">
        <div className="px-2 pb-1 font-medium text-gray-500 text-xs">
          {hasSearch ? '搜索结果' : '全部应用'}
        </div>
        <div
          className={cn(
            'overflow-y-auto',
            isSheet ? 'max-h-[calc(72vh-230px)]' : 'max-h-[360px]',
          )}
        >
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <AppRow
                app={app}
                isActive={app.id === currentAppId}
                key={app.id}
                onSelect={onNavigateToApp}
              />
            ))
          ) : (
            <Empty
              className="my-8"
              description={hasSearch ? '没有匹配的应用' : '暂无应用'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </div>
      <div className="flex items-center justify-end border-gray-100 border-t p-2">
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateApp}>
          添加应用
        </Button>
      </div>
    </div>
  );
}

function AppRow({
  app,
  isActive,
  onSelect,
}: {
  app: AppItem;
  isActive: boolean;
  onSelect: (appId: number) => void;
}) {
  const appKeyLabel = formatAppKey(app.appKey);

  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50',
        isActive ? 'bg-blue-50' : undefined,
      )}
      onClick={() => onSelect(app.id)}
      type="button"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
        <PlatformIcon platform={app.platform} className="text-lg!" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{app.name}</span>
          {app.status === 'paused' && <Tag className="m-0">暂停</Tag>}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-gray-500 text-xs">
          <span>{platformLabels[app.platform]}</span>
          {appKeyLabel && (
            <span className="truncate font-mono" title={app.appKey}>
              AppKey: {appKeyLabel}
            </span>
          )}
          {app.checkCount !== undefined && (
            <span>{app.checkCount.toLocaleString()} 次</span>
          )}
        </span>
      </span>
      {isActive && (
        <Tag color="blue" className="m-0 shrink-0">
          当前
        </Tag>
      )}
    </button>
  );
}

function formatAppKey(appKey?: string) {
  if (!appKey) {
    return null;
  }
  if (appKey.length <= 14) {
    return appKey;
  }
  return `${appKey.slice(0, 6)}...${appKey.slice(-4)}`;
}

function getSelectedKeys(pathname: string) {
  if (pathname === rootRouterPath.user) {
    return ['user'];
  }
  if (pathname === rootRouterPath.apiTokens) {
    return ['api-tokens'];
  }
  if (pathname === rootRouterPath.auditLogs) {
    return ['audit-logs'];
  }
  if (pathname === rootRouterPath.realtimeMetrics) {
    return ['realtime-metrics'];
  }
  if (pathname === rootRouterPath.adminConfig) {
    return ['admin-config'];
  }
  if (pathname === rootRouterPath.adminUsers) {
    return ['admin-users'];
  }
  if (pathname === rootRouterPath.adminApps) {
    return ['admin-apps'];
  }
  if (pathname === rootRouterPath.adminMetrics) {
    return ['admin-metrics'];
  }
  return [];
}

function getCurrentAppId(pathname: string) {
  const match = pathname.match(/^\/apps\/(\d+)/);
  return match ? Number(match[1]) : null;
}

interface ExtLinkProps {
  children: ReactNode;
  href: string;
}

function ExtLink({ children, href }: ExtLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline"
    >
      {children}
    </a>
  );
}
