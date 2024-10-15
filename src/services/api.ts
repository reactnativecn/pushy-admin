import { queryClient } from '@/utils/queryClient';
import request from './request';

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token: string }>('post', '/user/login', params),
  activate: (params: { token: string }) => request('post', '/user/activate', params),
  me: () => request<User>('get', '/user/me'),
  sendEmail: (params: { email: string }) => request('post', '/user/activate/sendmail', params),
  resetpwdSendMail: (params: { email: string }) =>
    request('post', '/user/resetpwd/sendmail', params),
  register: (params: { [key: string]: string }) => request('post', '/user/register', params),
  resetPwd: (params: { token: string; newPwd: string }) =>
    request('post', '/user/resetpwd/reset', params),
  // app
  appList: () => request<{ data: App[] }>('get', '/app/list'),
  getApp: (appId: number) => request<App>('get', `/app/${appId}`),
  deleteApp: (appId: number) =>
    request('delete', `/app/${appId}`).then(() => {
      queryClient.setQueryData(['appList'], ({ data }: { data: App[] }) => ({
        data: data?.filter((i) => i.id !== appId),
      }));
    }),
  createApp: (params: { name: string; platform: string }) =>
    request<{ id: number }>('post', '/app/create', params).then(({ id }) => {
      queryClient.setQueryData(['appList'], ({ data }: { data: App[] }) => ({
        data: [...(data || []), { ...params, id }],
      }));
    }),
  updateApp: (appId: number, params: Omit<App, 'appKey' | 'checkCount' | 'id' | 'platform'>) =>
    request('put', `/app/${appId}`, params).then(() => {
      queryClient.setQueryData(['app', appId], (old: App | undefined) => ({ ...old, ...params }));
      queryClient.setQueryData(['appList'], ({ data }: { data: App[] }) => ({
        data: data?.map((i) => (i.id === appId ? { ...i, ...params } : i)),
      }));
    }),
  // package
  getPackages: (appId: number) =>
    request<{ data: Package[]; count: number }>('get', `/app/${appId}/package/list?limit=1000`),
  updatePackage: ({
    appId,
    packageId,
    params,
  }: {
    appId: number;
    packageId: number;
    params: { note?: string; status?: Package['status']; versionId?: number | null };
  }) =>
    request('put', `/app/${appId}/package/${packageId}`, params).then(() => {
      queryClient.setQueryData(['packages', appId], ({ data }: { data: Package[] }) => ({
        data: data?.map((i) => (i.id === packageId ? { ...i, ...params } : i)),
      }));
      if (params.versionId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['versions', appId] });
      }
    }),
  deletePackage: ({ appId, packageId }: { appId: number; packageId: number }) =>
    request('delete', `/app/${appId}/package/${packageId}`).then(() => {
      queryClient.setQueryData(['packages', appId], ({ data }: { data: Package[] }) => ({
        data: data?.filter((i) => i.id !== packageId),
      }));
    }),
  // version
  getVersions: ({
    appId,
    offset = 0,
    limit = 10,
  }: {
    appId: number;
    offset?: number;
    limit?: number;
  }) =>
    request<{ data: Version[]; count: number }>(
      'get',
      `/app/${appId}/version/list?offset=${offset}&limit=${limit}`
    ),
  updateVersion: ({
    versionId,
    appId,
    params,
  }: {
    versionId: number;
    appId: number;
    params: Partial<Omit<Version, 'id' | 'packages'>>;
  }) =>
    request('put', `/app/${appId}/version/${versionId}`, params).then(() => {
      queryClient.setQueriesData({ queryKey: ['versions', appId] }, (old?: { data: Version[] }) =>
        old
          ? {
              ...old,
              data: old.data?.map((i) => (i.id === versionId ? { ...i, ...params } : i)),
            }
          : undefined
      );
    }),
  deleteVersion: ({ appId, versionId }: { appId: number; versionId: number }) =>
    request('delete', `/app/${appId}/version/${versionId}`).then(() => {
      queryClient.setQueriesData({ queryKey: ['versions', appId] }, (old?: { data: Version[] }) =>
        old
          ? {
              ...old,
              data: old.data?.filter((i) => i.id !== versionId),
            }
          : undefined
      );
    }),
  // order
  createOrder: (params: { tier?: string }) =>
    request<{ payUrl: string }>('post', '/orders', params),
};
