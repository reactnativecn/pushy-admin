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

export const useApp = (id: number) => {
  const { data } = useQuery({
    queryKey: ['app', id],
    queryFn: () => api.getAppData(id),
    enabled: () => !!getToken(),
  });
  return { app: data?.data };
};

export const usePackages = (id: number) => {
  const { data } = useQuery({
    queryKey: ['packages', id],
    queryFn: () => api.getPackages(id),
    enabled: () => !!getToken(),
  });
  return { packages: data?.data, unused: data?.data?.filter((i) => i.version === null) };
};
