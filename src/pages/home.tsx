import { Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { useUserInfo } from '@/utils/hooks';

export const Component = () => {
  const { isLoading, user } = useUserInfo();

  if (isLoading || user === undefined) {
    return (
      <div className="page-section flex min-h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <Navigate
      replace
      to={user?.admin ? rootRouterPath.adminServiceStatus : rootRouterPath.apps}
    />
  );
};
