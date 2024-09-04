import { createHashRouter, Navigate } from 'react-router-dom';
import MainLayout from './MainLayout';

// const UserRoute = observer((props: RouteProps) => {
//   if (!store.token) return <Login />;
//   if (!store.user) {
//     return (
//       <div style={style.spin}>
//         <Spin size='large' />
//       </div>
//     );
//   }
//   return <Route {...props} />;
// });

export const rootRouterPath = {
  user: '/user',
  apps: '/apps',
  versions: (id: string) => `/apps/${id}`,
  resetPassword: (step: string) => `/reset-password/${step}`,
};

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: 'index',
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
        path: 'apps/:id',
        lazy: () => import('./pages/versions'),
      },
    ],
  },
]);
