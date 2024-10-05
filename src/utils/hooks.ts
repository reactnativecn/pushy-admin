import { useQuery } from '@tanstack/react-query';

import dayjs from 'dayjs';
import { api } from '@/services/api';
import { getToken } from '@/services/request';

export const useUserInfo = () => {
  const { data } = useQuery({
    queryKey: ['userInfo'],
    queryFn: api.me,
  });
  const expireDay = dayjs(data?.tierExpiresAt);
  const displayExpireDay = expireDay.format('YYYY年MM月DD日');
  const remainingDays = expireDay.diff(dayjs(), 'day');
  const isExpiringSoon = remainingDays <= 90;
  const displayRemainingDays = isExpiringSoon ? `(剩余 ${remainingDays} 天)` : '';
  return {
    user: getToken() ? data : null,
    displayExpireDay,
    displayRemainingDays,
    isExpiringSoon,
  };
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
