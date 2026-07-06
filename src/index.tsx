import { StyleProvider } from '@ant-design/cssinjs';
import { theme as antdTheme, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';

import './index.css';
import './i18n';
import './utils/dayjs';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { themeConfig } from './theme';
import { showNotices } from './utils/notice';
import { queryClient } from './utils/queryClient';
import { ThemeModeProvider, useThemeMode } from './utils/theme-mode';

const antdLocaleMap: Record<string, typeof zhCN> = {
  en: enUS,
  'zh-CN': zhCN,
};

const isLocalHost = () => {
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  );
};

const shouldEnablePwa = process.env.NODE_ENV === 'production' && !isLocalHost();

const hasServiceWorker = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

const clearLocalPwaState = () => {
  if (hasServiceWorker()) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations.map((registration) => registration.unregister()),
        ),
      )
      .catch(() => {
        // SW cleanup failed, app continues normally.
      });
  }

  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {
        // Cache cleanup failed, app continues normally.
      });
  }
};

if (hasServiceWorker() && shouldEnablePwa) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed, app continues normally
    });
  });
} else if (isLocalHost()) {
  window.addEventListener('load', clearLocalPwaState);
}

function ThemedApp() {
  const { i18n } = useTranslation();
  const { isDark } = useThemeMode();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const antdLocale = antdLocaleMap[language] ?? zhCN;
  const theme = useMemo(
    () => ({
      ...themeConfig,
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    }),
    [isDark],
  );

  useEffect(() => {
    showNotices();
  }, []);

  return (
    // layer: antd 样式进入 @layer antd(index.css 声明的层序中低于 Tailwind
    // utilities),否则 cssinjs 的未分层样式会压掉 mb-4 等工具类
    <StyleProvider layer>
      <ConfigProvider locale={antdLocale} theme={theme}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ConfigProvider>
    </StyleProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}

const root = document.getElementById('main');
if (root) {
  createRoot(root).render(<App />);
}
