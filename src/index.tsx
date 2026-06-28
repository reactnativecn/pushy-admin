import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';

import './index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './utils/queryClient';

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

const root = document.getElementById('main');
if (root) {
  createRoot(root).render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
