import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import { getToken } from '@/services/request';

export const useUserInfo = () => {
  const { data } = useQuery({
    queryKey: ['userInfo'],
    queryFn: api.me,
    enabled: () => !!getToken(),
  });
  return { user: getToken() ? data : null };
};

export const useAppList = () => {
  const { data } = useQuery({
    queryKey: ['appList'],
    queryFn: api.appList,
    enabled: () => !!getToken(),
  });
  return { apps: data?.data };
};

export const useApp = (appId: number) => {
  const { data } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api.getApp(appId),
    enabled: () => !!getToken(),
  });
  return { app: data?.data };
};

export const usePackages = (appId: number) => {
  const { data } = useQuery({
    queryKey: ['packages', appId],
    queryFn: () => api.getPackages(appId),
    enabled: () => !!getToken(),
  });
  return { packages: data?.data, unused: data?.data?.filter((i) => i.version === null) };
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
  const { data } = useQuery({
    queryKey: ['versions', appId, offset, limit],
    staleTime: 0,
    queryFn: () => api.getVersions({ appId, offset, limit }),
    enabled: () => !!getToken(),
  });
  return { versions: data?.data, count: data?.count };
};
