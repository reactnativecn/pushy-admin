import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useEffect } from 'react';
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

function App() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const antdLocale = antdLocaleMap[language] ?? zhCN;

  useEffect(() => {
    showNotices();
  }, []);

  return (
    <ConfigProvider locale={antdLocale} theme={themeConfig}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

const root = document.getElementById('main');
if (root) {
  createRoot(root).render(<App />);
}
