import { createHashRouter, Navigate, redirect } from 'react-router-dom';
import MainLayout from './MainLayout';
import store from './store';

export const rootRouterPath = {
  user: '/user',
  apps: '/apps',
  versions: (id: string) => `/apps/${id}`,
  resetPassword: (step: string) => `/reset-password/${step}`,
  inactivated: '/inactivated',
  login: '/login',
};

export const needAuthLoader = ({ request }: { request: Request }) => {
  if (!store.token) {
    const { pathname, search } = new URL(request.url);
    if (pathname === rootRouterPath.login) {
      return null;
    }
    if (pathname === '/') {
      return redirect(rootRouterPath.login);
    }
    return redirect(`${rootRouterPath.login}?loginFrom=${encodeURIComponent(pathname + search)}`);
  }
  return null;
};

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    loader: needAuthLoader,
    children: [
      {
        path: '',
        element: <Navigate to={rootRouterPath.user} />,
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
        path: 'apps',
        lazy: () => import('./pages/apps'),
      },
      {
        path: 'apps/:id',
        lazy: () => import('./pages/versions'),
      },
      {
        path: 'user',
        lazy: () => import('./pages/user'),
      },
      {
        path: 'login',
        lazy: () => import('./pages/login'),
      },
    ],
  },
]);
