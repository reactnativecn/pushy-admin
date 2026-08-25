import { Spin } from 'antd';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserInfo } from '@/utils/hooks';

/**
 * 管理员路由的门控：子路由用 react-router 自带的 `lazy` 按需加载，
 * 这里只负责在用户信息就绪前占位、非管理员时跳走。
 */
export function AdminRoute() {
  const { isLoading, user } = useUserInfo();

  if (isLoading || user === undefined) {
    return (
      <div className="page-section flex min-h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!user?.admin) {
    return <Navigate replace to="/apps" />;
  }

  return <Outlet />;
}
