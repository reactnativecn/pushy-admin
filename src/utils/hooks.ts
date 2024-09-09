import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import { getToken } from '@/services/request';
import { queryClient } from './queryClient';

export const useUserInfo = () => {
  const { data } = useQuery({
    queryKey: ['userInfo', getToken()],
    queryFn: api.me,
  });
  return { user: data };
};

export const useAppList = () => {
  const { data } = useQuery({
    queryKey: ['appList'],
    queryFn: api.appList,
  });
  return { apps: data?.data };
};

export const resetAppList = () => {
  queryClient.invalidateQueries({ queryKey: ['appList'] });
};
