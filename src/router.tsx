import { createHashRouter, redirect } from 'react-router-dom';
import { AdminRoute } from './components/admin-route';
import { ErrorBoundary } from './components/error-boundary';
import MainLayout from './components/main-layout';
import { hasSession } from './services/request';
import {
  getUnauthenticatedRedirect,
  resolveLoginRedirect,
} from './utils/safe-redirect';

export const rootRouterPath = {
  home: '/',
  apps: '/apps',
  user: '/user',
  versions: (id: string) => `/apps/${id}`,
  resetPassword: (step: string) => `/reset-password/${step}`,
  activate: '/activate',
  inactivated: '/inactivated',
  login: '/login',
  welcome: '/welcome',
  register: '/register',
  auditLogs: '/audit-logs',
  realtimeMetrics: '/realtime-metrics',
  adminConfig: '/admin-config',
  adminUsers: '/admin-users',
  adminApps: '/admin-apps',
  adminMetrics: '/admin-metrics',
  adminServiceStatus: '/admin-service-status',
  apiTokens: '/api-tokens',
};

export const needAuthLoader = ({ request }: { request: Request }) => {
  if (!hasSession()) {
    const { pathname, search } = new URL(request.url);
    const target = getUnauthenticatedRedirect(pathname, search);
    return target ? redirect(target) : null;
  }
  return null;
};

export const publicOnlyLoader = ({ request }: { request: Request }) => {
  if (!hasSession()) {
    return null;
  }

  const { search } = new URL(request.url);
  const loginFrom = new URLSearchParams(search).get('loginFrom');
  return redirect(resolveLoginRedirect(loginFrom));
};

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        loader: needAuthLoader,
        lazy: () => import('./pages/home'),
      },
      {
        path: 'apps',
        loader: needAuthLoader,
        lazy: () => import('./pages/apps'),
      },
      {
        path: 'welcome',
        lazy: () => import('./pages/welcome'),
      },
      {
        path: 'reset-password/:step',
        lazy: () => import('./pages/reset-password'),
      },
      {
        path: 'activate',
        lazy: () => import('./pages/activate'),
      },
      {
        path: 'inactivated',
        lazy: () => import('./pages/inactivated'),
      },
      {
        path: 'register',
        lazy: () => import('./pages/register'),
      },
      {
        path: 'login',
        loader: publicOnlyLoader,
        lazy: () => import('./pages/login'),
      },
      {
        path: 'apps/:id',
        loader: needAuthLoader,
        lazy: () => import('./pages/manage'),
      },
      {
        path: 'user',
        loader: needAuthLoader,
        lazy: () => import('./pages/user'),
      },
      {
        path: 'audit-logs',
        loader: needAuthLoader,
        lazy: () => import('./pages/audit-logs'),
      },
      {
        path: 'realtime-metrics',
        loader: needAuthLoader,
        lazy: () => import('./pages/realtime-metrics'),
      },
      {
        path: 'admin-config',
        loader: needAuthLoader,
        element: <AdminRoute load={() => import('./pages/admin-config')} />,
      },
      {
        path: 'admin-users',
        loader: needAuthLoader,
        element: <AdminRoute load={() => import('./pages/admin-users')} />,
      },
      {
        path: 'admin-apps',
        loader: needAuthLoader,
        element: <AdminRoute load={() => import('./pages/admin-apps')} />,
      },
      {
        path: 'admin-metrics',
        loader: needAuthLoader,
        element: <AdminRoute load={() => import('./pages/admin-metrics')} />,
      },
      {
        path: 'admin-service-status',
        loader: needAuthLoader,
        element: (
          <AdminRoute load={() => import('./pages/admin-service-status')} />
        ),
      },
      {
        // 部署面板已并入服务状态页，兼容旧书签
        path: 'admin-deploy',
        loader: () => redirect(rootRouterPath.adminServiceStatus),
      },
      {
        path: 'api-tokens',
        loader: needAuthLoader,
        lazy: () => import('./pages/api-tokens'),
      },
    ],
  },
]);
