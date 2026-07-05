import {
  CommentOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  OpenAIOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { rootRouterPath } from '@/router';

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

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
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
      trigger={['click']}
    >
      <Button
        aria-label={t('nav.language')}
        className={compact ? 'px-2' : undefined}
        icon={<GlobalOutlined />}
        type="text"
      >
        {compact
          ? null
          : t(`nav.language_${currentLanguage === 'zh-CN' ? 'zh' : 'en'}`)}
      </Button>
    </Dropdown>
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
