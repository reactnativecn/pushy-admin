import {
  AppstoreOutlined,
  CommentOutlined,
  DashboardOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LineChartOutlined,
  MenuOutlined,
  OpenAIOutlined,
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
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  type AppDrawerItem,
  useAppWorkspaceList,
} from '@/components/app-drawer';
import { rootRouterPath, router } from '@/router';
import {
  cn,
  getManageAppDrawerPlacement,
  getRecentAppIds,
  manageAppDrawerPlacementChangeEvent,
  rememberRecentApp,
  setManageAppDrawerPlacement,
} from '@/utils/helper';
import { useUserInfo } from '@/utils/hooks';
import { ReactComponent as LogoH } from '../assets/logo-h.svg';
import { useAppSettingsModal } from './app-settings-modal';
import { showCreateAppModal } from './create-app-modal';
import { DailyCheckQuotaUserTrigger } from './daily-check-quota';
import PlatformIcon from './platform-icon';

type AppItem = AppDrawerItem;

interface TopNavigationProps {
  isMobile: boolean;
  showAuthenticatedChrome: boolean;
}

type MenuItems = NonNullable<MenuProps['items']>;

const platformLabels: Record<AppItem['platform'], string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
};

function getExternalItems(
  t: (key: string) => string,
  language?: string,
): MenuItems {
  const isChinese = language?.toLowerCase().startsWith('zh');
  const docsUrl = isChinese
    ? 'https://pushy.reactnative.cn/docs/getting-started.html'
    : 'https://reactnative.dev/docs/getting-started';
  const aboutUrl = isChinese
    ? 'https://reactnative.cn/about.html'
    : 'https://reactnative.dev/';

  return [
    {
      key: 'issues',
      icon: <CommentOutlined />,
      label: (
        <ExtLink href="https://github.com/reactnativecn/react-native-pushy/issues">
          {t('nav.issues')}
        </ExtLink>
      ),
    },
    {
      key: 'document',
      icon: <ReadOutlined />,
      label: <ExtLink href={docsUrl}>{t('nav.documentation')}</ExtLink>,
    },
    {
      key: 'about',
      icon: <InfoCircleOutlined />,
      label: <ExtLink href={aboutUrl}>{t('nav.about_us')}</ExtLink>,
    },
    {
      key: 'ai-cresc',
      icon: <OpenAIOutlined />,
      label: (
        <ExtLink href="https://ai.cresc.dev">
          <span style={{ fontWeight: 'bold' }}>{t('nav.ai_promo')}</span>
        </ExtLink>
      ),
    },
  ];
}

export default function TopNavigation({
  isMobile,
  showAuthenticatedChrome,
}: TopNavigationProps) {
  const { t, i18n } = useTranslation();
  const { user } = useUserInfo();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appDrawerPlacement, setAppDrawerPlacementState] = useState(
    getManageAppDrawerPlacement,
  );
  const selectedKeys = useMemo(() => getSelectedKeys(pathname), [pathname]);
  const shouldShowAppsTopTab =
    showAuthenticatedChrome &&
    user &&
    !isMobile &&
    appDrawerPlacement !== 'hidden';

  useEffect(() => {
    const syncPlacement = () => {
      setAppDrawerPlacementState(getManageAppDrawerPlacement());
    };

    window.addEventListener(manageAppDrawerPlacementChangeEvent, syncPlacement);
    window.addEventListener('storage', syncPlacement);
    return () => {
      window.removeEventListener(
        manageAppDrawerPlacementChangeEvent,
        syncPlacement,
      );
      window.removeEventListener('storage', syncPlacement);
    };
  }, []);

  const externalItems = getExternalItems(
    t,
    i18n.resolvedLanguage ?? i18n.language,
  );

  const authenticatedItems: MenuItems =
    showAuthenticatedChrome && user
      ? [
          ...(shouldShowAppsTopTab
            ? [
                {
                  key: 'apps',
                  icon: <AppstoreOutlined />,
                  label: (
                    <Link to={rootRouterPath.apps}>
                      {t('nav.applications')}
                    </Link>
                  ),
                },
              ]
            : []),
          ...(user.admin
            ? [
                {
                  key: 'admin-service-status',
                  icon: <DashboardOutlined />,
                  label: (
                    <Link to={rootRouterPath.adminServiceStatus}>
                      {t('nav.service_status')}
                    </Link>
                  ),
                },
              ]
            : []),
          {
            key: 'audit-logs',
            icon: <FileTextOutlined />,
            label: (
              <Link to={rootRouterPath.auditLogs}>{t('nav.audit_logs')}</Link>
            ),
          },
          {
            key: 'realtime-metrics',
            icon: <LineChartOutlined />,
            label: (
              <Link to={rootRouterPath.realtimeMetrics}>
                {t('nav.realtime_metrics')}
              </Link>
            ),
          },
          {
            key: 'api-tokens',
            icon: <KeyOutlined />,
            label: (
              <Link to={rootRouterPath.apiTokens}>{t('nav.api_tokens')}</Link>
            ),
          },
          ...(user.admin
            ? [
                {
                  key: 'admin',
                  icon: <SettingOutlined />,
                  label: t('nav.admin'),
                  children: [
                    {
                      key: 'admin-config',
                      label: (
                        <Link to={rootRouterPath.adminConfig}>
                          {t('nav.dynamic_config')}
                        </Link>
                      ),
                    },
                    {
                      key: 'admin-users',
                      label: (
                        <Link to={rootRouterPath.adminUsers}>
                          {t('nav.user_management')}
                        </Link>
                      ),
                    },
                    {
                      key: 'admin-apps',
                      label: (
                        <Link to={rootRouterPath.adminApps}>
                          {t('nav.app_management')}
                        </Link>
                      ),
                    },
                    {
                      key: 'admin-metrics',
                      label: (
                        <Link to={rootRouterPath.adminMetrics}>
                          {t('nav.global_metrics')}
                        </Link>
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
            label: (
              <Link to={rootRouterPath.user}>{t('nav.account_settings')}</Link>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-16 w-full min-w-0 items-center gap-1.5 md:gap-3">
      <Link
        to={rootRouterPath.home}
        className="flex shrink-0 items-center no-underline"
      >
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
            aria-label={t('nav.open_menu')}
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
              className="flex h-14 w-40 items-center rounded-xl px-2 text-slate-700 no-underline transition-colors hover:bg-slate-50"
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
  const { t } = useTranslation();
  return (
    <Drawer
      height="68vh"
      onClose={onClose}
      open={open}
      placement="bottom"
      title={t('nav.menu')}
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
  const { t } = useTranslation();
  const { apps } = useAppWorkspaceList();
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentAppIds, setRecentAppIds] = useState(() => getRecentAppIds());
  const [appDrawerPlacement, setAppDrawerPlacementState] = useState(
    getManageAppDrawerPlacement,
  );
  const currentAppId = getCurrentAppId(pathname);
  const currentAppKey = getCurrentAppKey(pathname, search);
  const { appMap, appKeyMap } = useMemo(() => {
    const byId = new Map<number, AppItem>();
    const byKey = new Map<string, AppItem>();
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      if (app.id) {
        byId.set(app.id, app);
      }
      if (app.appKey) {
        byKey.set(app.appKey, app);
      }
    }
    return { appMap: byId, appKeyMap: byKey };
  }, [apps]);
  let currentApp: AppItem | undefined;
  if (currentAppId) {
    currentApp = appMap.get(currentAppId);
  } else if (currentAppKey) {
    currentApp = appKeyMap.get(currentAppKey);
  }
  const activeAppId = currentApp?.id ?? currentAppId;
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
    if (activeAppId) {
      setRecentAppIds(rememberRecentApp(activeAppId));
    }
  }, [activeAppId]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    const syncPlacement = () => {
      setAppDrawerPlacementState(getManageAppDrawerPlacement());
    };

    window.addEventListener(manageAppDrawerPlacementChangeEvent, syncPlacement);
    window.addEventListener('storage', syncPlacement);
    return () => {
      window.removeEventListener(
        manageAppDrawerPlacementChangeEvent,
        syncPlacement,
      );
      window.removeEventListener('storage', syncPlacement);
    };
  }, []);

  const navigateToApp = (appId: number) => {
    setRecentAppIds(rememberRecentApp(appId));
    setOpen(false);
    router.navigate(rootRouterPath.versions(String(appId)));
  };

  const openSettings = (app: AppItem) => {
    setOpen(false);
    openAppSettings(app);
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

  const isAppDrawerVisible = appDrawerPlacement !== 'hidden';
  const canOpenAppList = compact || !isAppDrawerVisible;
  const toggleAppDrawer = () => {
    const nextPlacement = isAppDrawerVisible ? 'hidden' : 'left';
    setAppDrawerPlacementState(nextPlacement);
    setManageAppDrawerPlacement(nextPlacement);
  };

  useEffect(() => {
    if (!canOpenAppList && open) {
      setOpen(false);
    }
  }, [canOpenAppList, open]);

  const triggerLabel = currentApp?.name ?? t('nav.select_app');
  const content = (
    <AppSwitcherContent
      currentAppId={activeAppId}
      filteredApps={filteredApps}
      isAppDrawerVisible={isAppDrawerVisible}
      isSheet={compact}
      onCreateApp={createApp}
      onNavigateToApp={navigateToApp}
      onSettings={openSettings}
      onToggleAppDrawer={toggleAppDrawer}
      query={query}
      recentApps={recentApps}
      setQuery={setQuery}
      totalAppCount={apps.length}
    />
  );
  const trigger = (
    <button
      className={cn(
        'flex h-16 min-w-0 cursor-pointer items-center border-0 border-slate-200 border-x bg-slate-50 px-4 text-left transition-colors hover:bg-white',
        compact ? 'max-w-[150px] flex-1 px-2' : 'w-72 lg:w-80',
      )}
      onClick={compact ? () => setOpen(true) : undefined}
      aria-expanded={canOpenAppList ? open : undefined}
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
            <Tag className="m-0 shrink-0">{t('nav.paused')}</Tag>
          )}
        </span>
        {canOpenAppList && (
          <DownOutlined className="ml-auto shrink-0 text-xs" />
        )}
      </span>
    </button>
  );

  if (compact) {
    return (
      <>
        {contextHolder}
        {trigger}
        <Drawer
          height="72vh"
          onClose={() => setOpen(false)}
          open={open}
          placement="bottom"
          title={t('nav.select_app')}
          styles={{ body: { padding: 0 } }}
        >
          {content}
        </Drawer>
      </>
    );
  }

  if (!canOpenAppList) {
    return null;
  }

  return (
    <>
      {contextHolder}
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
    </>
  );
}

interface AppSwitcherContentProps {
  currentAppId: number | null;
  filteredApps: AppItem[];
  isAppDrawerVisible: boolean;
  isSheet?: boolean;
  onCreateApp: () => void;
  onNavigateToApp: (appId: number) => void;
  onSettings: (app: AppItem) => void;
  onToggleAppDrawer: () => void;
  query: string;
  recentApps: AppItem[];
  setQuery: (query: string) => void;
  totalAppCount: number;
}

function AppSwitcherContent({
  currentAppId,
  filteredApps,
  isAppDrawerVisible,
  isSheet = false,
  onCreateApp,
  onNavigateToApp,
  onSettings,
  onToggleAppDrawer,
  query,
  recentApps,
  setQuery,
  totalAppCount,
}: AppSwitcherContentProps) {
  const { t } = useTranslation();
  const hasSearch = query.trim().length > 0;

  return (
    <div className={isSheet ? 'w-full' : 'w-[min(460px,calc(100vw-32px))]'}>
      <div className="border-gray-100 border-b p-3">
        <Input
          allowClear
          autoFocus
          prefix={<SearchOutlined />}
          placeholder={t('nav.search_apps')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {recentApps.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-gray-500">
              {t('nav.recent_access')}
            </span>
            {recentApps.map((app) => (
              <button
                className={cn(
                  'inline-flex max-w-[180px] cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 text-xs transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600',
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
                    {t('nav.paused')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-2 py-2">
        <div className="px-2 pb-1 font-medium text-gray-500 text-xs">
          {hasSearch
            ? t('nav.search_results', {
                filtered: filteredApps.length,
                total: totalAppCount,
              })
            : t('nav.all_apps', { total: totalAppCount })}
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
                onSettings={onSettings}
              />
            ))
          ) : (
            <Empty
              className="my-8"
              description={
                hasSearch ? t('nav.no_matching_apps') : t('nav.no_apps')
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-gray-100 border-t p-2">
        {isSheet ? (
          <span />
        ) : (
          <Button
            icon={
              isAppDrawerVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />
            }
            onClick={onToggleAppDrawer}
          >
            {isAppDrawerVisible ? t('nav.hide_sidebar') : t('nav.show_sidebar')}
          </Button>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateApp}>
          {t('nav.add_app')}
        </Button>
      </div>
    </div>
  );
}

function AppRow({
  app,
  isActive,
  onSelect,
  onSettings,
}: {
  app: AppItem;
  isActive: boolean;
  onSelect: (appId: number) => void;
  onSettings: (app: AppItem) => void;
}) {
  const { t } = useTranslation();
  const appKeyLabel = formatAppKey(app.appKey);

  return (
    <div
      className={cn(
        'group flex w-full cursor-pointer items-center rounded-lg transition-colors hover:bg-gray-50',
        isActive ? 'bg-blue-50' : undefined,
      )}
    >
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-3 text-left"
        onClick={() => onSelect(app.id)}
        type="button"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <PlatformIcon platform={app.platform} className="text-lg!" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{app.name}</span>
              {app.status === 'paused' && (
                <Tag className="m-0">{t('nav.paused')}</Tag>
              )}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-2 text-gray-500 text-xs">
              <span>{platformLabels[app.platform]}</span>
              {appKeyLabel && (
                <span
                  className="truncate font-mono"
                  title={app.appKey || undefined}
                >
                  AppKey: {appKeyLabel}
                </span>
              )}
            </span>
          </span>
          <span className="w-20 shrink-0 text-right">
            <span className="block font-semibold text-slate-800 text-sm tabular-nums">
              {(app.checkCount ?? 0).toLocaleString()}
            </span>
            <span className="block text-[10px] text-gray-500">
              {t('nav.checks')}
            </span>
          </span>
        </span>
        <span className="flex w-12 shrink-0 justify-end">
          {isActive && (
            <Tag color="blue" className="m-0 shrink-0">
              {t('nav.current')}
            </Tag>
          )}
        </span>
      </button>
      <button
        aria-label={t('nav.open_app_settings', { name: app.name })}
        className="mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-white hover:text-blue-600"
        onClick={() => onSettings(app)}
        title={t('nav.app_settings')}
        type="button"
      >
        <SettingOutlined className="text-base" />
      </button>
    </div>
  );
}

function formatAppKey(appKey?: string | null) {
  if (!appKey) {
    return null;
  }
  if (appKey.length <= 14) {
    return appKey;
  }
  return `${appKey.slice(0, 6)}...${appKey.slice(-4)}`;
}

function getSelectedKeys(pathname: string) {
  if (pathname === rootRouterPath.home || pathname === rootRouterPath.apps) {
    return ['apps'];
  }
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
  if (pathname === rootRouterPath.adminServiceStatus) {
    return ['admin-service-status'];
  }
  return [];
}

function getCurrentAppId(pathname: string) {
  const match = pathname.match(/^\/apps\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function getCurrentAppKey(pathname: string, search: string) {
  if (pathname !== rootRouterPath.realtimeMetrics) {
    return null;
  }
  return new URLSearchParams(search).get('appKey');
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
