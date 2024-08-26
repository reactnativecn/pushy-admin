/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { request, API } from '../utils';
import useAppList from './useApplist';

const useUserInfo = () => {
  const { fetchApps } = useAppList();

  const fetchUserInfo = async () => {
    try {
      const userInfo: User = await request('get', API.meUrl);
      await fetchApps();
      return userInfo;
    } catch (err) {
      // logout();
      // TODO 此处是否需要手动删除 user 信息
      localStorage.removeItem('token');
      message.error('登录已失效，请重新登录');
    }
  };
  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
  });

  return { fetchUserInfo, userInfo };
};

export default useUserInfo;
