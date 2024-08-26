/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request, API } from '../utils';

const useAppList = () => {
  const fetchApps = useCallback(async () => {
    try {
      const res = await request('get', API.listUrl);
      if (res?.data) {
        const appList = res.data;
        return appList;
      }
    } catch (err) {
      console.log('err', err);
    }
  }, []);

  const { data: appList } = useQuery({
    queryKey: ['appList'],
    queryFn: fetchApps,
  });

  return { fetchApps, appList };
};

export default useAppList;
