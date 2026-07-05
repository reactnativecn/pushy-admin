import {
  AppstoreOutlined,
  DashboardOutlined,
  FileTextOutlined,
  KeyOutlined,
  LineChartOutlined,
  MenuOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Drawer, Menu } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { cn } from '@/utils/helper';
import { useUserInfo } from '@/utils/hooks';
import { type ThemeMode, useThemeMode } from '@/utils/theme-mode';
import { ReactComponent as LogoH } from '../../assets/logo-h.svg';
import { DailyCheckQuotaUserTrigger } from '../daily-check-quota';
import { AppSwitcher } from './app-switcher';
import {
  getCurrentLanguage,
  getExternalItems,
  getLanguageMenuItem,
  getSelectedKeys,
  getThemeMenuItem,
  type MenuItems,
  NavControls,
} from './nav-items';
import { useManageAppDrawerPlacement } from './use-app-drawer-placement';

interface TopNavigationProps {
  isMobile: boolean;
  showAuthenticatedChrome: boolean;
}

export default function TopNavigation({
  isMobile,
  showAuthenticatedChrome,
}: TopNavigationProps) {
  const { t, i18n } = useTranslation();
  const { user } = useUserInfo();
  const { pathname } = useLocation();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appDrawerPlacement] = useManageAppDrawerPlacement();
  const selectedKeys = useMemo(() => getSelectedKeys(pathname), [pathname]);
  const shouldShowAppsTopTab =
    showAuthenticatedChrome &&
    user &&
    !isMobile &&
    appDrawerPlacement !== 'hidden';

  const currentLanguage = getCurrentLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const externalItems = getExternalItems(t, currentLanguage);

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
                    {
                      key: 'admin-deploy',
                      label: (
                        <Link to={rootRouterPath.adminDeploy}>
                          {t('nav.system_deploy')}
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
    getThemeMenuItem(t, themeMode),
    getLanguageMenuItem(t, currentLanguage),
    { type: 'divider' as const },
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
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-primary text-white shadow-sm transition-colors hover:bg-primary-hover',
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
            selectedKeys={[
              ...selectedKeys,
              `language:${currentLanguage}`,
              `theme:${themeMode}`,
            ]}
            onLanguageChange={(language) => {
              void i18n.changeLanguage(language);
            }}
            onThemeChange={setThemeMode}
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
          <NavControls />
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
  onLanguageChange,
  onThemeChange,
  open,
  selectedKeys,
}: {
  items: MenuItems;
  onClose: () => void;
  onLanguageChange: (language: string) => void;
  onThemeChange: (mode: ThemeMode) => void;
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
        onClick={({ key }) => {
          const keyText = String(key);
          if (keyText.startsWith('language:')) {
            onLanguageChange(keyText.replace('language:', ''));
          }
          if (keyText.startsWith('theme:')) {
            onThemeChange(keyText.replace('theme:', '') as ThemeMode);
          }
          onClose();
        }}
        selectedKeys={selectedKeys}
      />
    </Drawer>
  );
}
