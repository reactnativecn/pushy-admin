import {
  CommentOutlined,
  DesktopOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  MoonOutlined,
  OpenAIOutlined,
  ReadOutlined,
  SunOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { rootRouterPath } from '@/router';
import { type ThemeMode, useThemeMode } from '@/utils/theme-mode';

export type MenuItems = NonNullable<MenuProps['items']>;

function ExtLink({ children, href }: { children: ReactNode; href: string }) {
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

export function getExternalItems(
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

const languageOptions = [
  { key: 'zh-CN', labelKey: 'nav.language_zh' },
  { key: 'en', labelKey: 'nav.language_en' },
] as const;

export function getCurrentLanguage(language?: string) {
  return language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLanguage = getCurrentLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const items: MenuItems = languageOptions.map(({ key, labelKey }) => ({
    key,
    label: t(labelKey),
  }));

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        selectedKeys: [currentLanguage],
        onClick: ({ key }) => {
          void i18n.changeLanguage(key);
        },
      }}
      placement="bottomRight"
      trigger={['hover', 'click']}
    >
      <Button
        aria-label={t('nav.language')}
        icon={<GlobalOutlined />}
        shape="circle"
        type="text"
      />
    </Dropdown>
  );
}

const themeModeIcons: Record<ThemeMode, ReactNode> = {
  auto: <DesktopOutlined />,
  light: <SunOutlined />,
  dark: <MoonOutlined />,
};

const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark'];

function ThemeSwitcher() {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const items: MenuItems = THEME_MODES.map((value) => ({
    key: value,
    icon: themeModeIcons[value],
    label: t(`nav.theme_${value}`),
  }));

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        selectedKeys: [mode],
        onClick: ({ key }) => {
          setMode(key as ThemeMode);
        },
      }}
      placement="bottomRight"
      trigger={['hover', 'click']}
    >
      <Button
        aria-label={t('nav.theme')}
        icon={themeModeIcons[mode]}
        shape="circle"
        type="text"
      />
    </Dropdown>
  );
}

/** 主题 + 语言切换：导航栏右侧的胶囊控件组。 */
export function NavControls() {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border-secondary p-0.5">
      <ThemeSwitcher />
      <LanguageSwitcher />
    </div>
  );
}

export function getLanguageMenuItem(
  t: (key: string) => string,
  currentLanguage: string,
): MenuItems[number] {
  return {
    key: 'language',
    icon: <GlobalOutlined />,
    label: t('nav.language'),
    children: languageOptions.map(({ key, labelKey }) => ({
      key: `language:${key}`,
      label: currentLanguage === key ? `${t(labelKey)} ✓` : t(labelKey),
    })),
  };
}

export function getThemeMenuItem(
  t: (key: string) => string,
  currentMode: ThemeMode,
): MenuItems[number] {
  return {
    key: 'theme',
    icon: themeModeIcons[currentMode],
    label: t('nav.theme'),
    children: THEME_MODES.map((value) => ({
      key: `theme:${value}`,
      icon: themeModeIcons[value],
      label:
        currentMode === value
          ? `${t(`nav.theme_${value}`)} ✓`
          : t(`nav.theme_${value}`),
    })),
  };
}

export function getSelectedKeys(pathname: string) {
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
