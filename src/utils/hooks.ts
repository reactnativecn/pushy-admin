import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '@/services/api';
import { getToken } from '@/services/request';
import 'dayjs/locale/zh-cn';
import { useMemo } from 'react';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);

export const useUserInfo = () => {
  const { data } = useQuery({
    queryKey: ['userInfo'],
    queryFn: api.me,
    enabled: () => !!getToken(),
  });
  const expireDay = dayjs(data?.tierExpiresAt);
  const displayExpireDay = data?.tierExpiresAt
    ? expireDay.format('YYYY年MM月DD日')
    : '无';
  const remainingDays = data?.tierExpiresAt
    ? expireDay.diff(dayjs(), 'day')
    : null;
  const isExpiringSoon = remainingDays !== null && remainingDays <= 90;
  const displayRemainingDays = isExpiringSoon
    ? `(剩余 ${remainingDays} 天，之后转为免费版)`
    : '';
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
  const { unusedPackages, packageMap, packages } = useMemo(() => {
    const packages = data?.data ?? [];
    const unusedPackages = [];
    const packageMap = new Map();
    for (const p of packages) {
      if (p.versions === null) {
        unusedPackages.push(p);
      }
      packageMap.set(p.id, p);
    }
    return { unusedPackages, packageMap, packages };
  }, [data?.data]);
  return {
    packages,
    unusedPackages,
    packageMap,
    isLoading,
  };
};

export const useVersions = ({
  appId,
  offset = 0,
  limit = 10,
}: {
  appId: number;
  offset?: number;
  limit?: number;
}) => {
  // Fetch all versions (up to 1000) from backend and cache them
  const { data, isLoading } = useQuery({
    queryKey: ['versions', appId],
    staleTime: 3000,
    queryFn: () => api.getVersions({ appId, offset: 0, limit: 1000 }),
  });

  // Implement frontend pagination
  const allVersions = data?.data ?? [];
  const totalCount = data?.count ?? 0;

  // Calculate pagination
  const startIndex = offset;
  const endIndex = offset + limit;
  const paginatedVersions = allVersions.slice(startIndex, endIndex);

  return {
    versions: paginatedVersions,
    count: totalCount,
    isLoading,
    // Also return all versions for components that might need them
    allVersions,
  };
};

export const useBinding = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ['bindings', appId],
    queryFn: () => api.getBinding(appId),
  });
  // const {packages} = usePackages(appId);
  // const {versions} = useVersions({appId});
  const bindings = data?.data ?? [];
  // let fullBindings: Binding[] = [];
  // let expBindings: Binding[] = [];
  // bindings.forEach((binding) => {
  //   if (
  //     binding.rollout === 100 ||
  //     binding.rollout === undefined ||
  //     binding.rollout === null
  //   ) {
  //     fullBindings.push(binding);
  //   } else {
  //     expBindings.push(binding);
  //   }
  // });
  return { bindings, isLoading };
};
