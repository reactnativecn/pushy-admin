import { Spin } from 'antd';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserInfo } from '@/utils/hooks';

type RouteModule = {
  Component: ComponentType;
};

export function AdminRoute({ load }: { load: () => Promise<RouteModule> }) {
  const { isLoading, user } = useUserInfo();
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    if (!user?.admin) {
      setComponent(null);
      return;
    }

    let isCanceled = false;
    setLoadError(null);
    load()
      .then((module) => {
        if (!isCanceled) {
          setComponent(() => module.Component);
        }
      })
      .catch((error) => {
        if (!isCanceled) {
          setLoadError(error);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [load, user?.admin]);

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

  if (loadError) {
    throw loadError;
  }

  if (!Component) {
    return (
      <div className="page-section flex min-h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return <Component />;
}
