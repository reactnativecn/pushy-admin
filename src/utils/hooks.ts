import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import { getToken } from '@/services/request';

export const useUserInfo = () => {
  const { data } = useQuery({
    queryKey: ['userInfo'],
    queryFn: api.me,
  });
  return { user: getToken() ? data : null };
};

export const useAppList = () => {
  const { data } = useQuery({
    queryKey: ['appList'],
    queryFn: api.appList,
  });
  return { apps: data?.data };
};

export const useApp = (appId: number) => {
  const { data } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api.getApp(appId),
  });
  return { app: data };
};

export const usePackages = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ['packages', appId],
    queryFn: () => api.getPackages(appId),
  });
  return {
    packages: data?.data,
    unusedPackages: data?.data?.filter((i) => i.version === null),
    isLoading,
  };
};

export const useVersions = ({
  appId,
  offset,
  limit,
}: {
  appId: number;
  offset?: number;
  limit?: number;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['versions', appId, offset, limit],
    staleTime: 0,
    queryFn: () => api.getVersions({ appId, offset, limit }),
  });
  return { versions: data?.data ?? [], count: data?.count ?? 0, isLoading };
};
