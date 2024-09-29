import { resetPackages, resetAppList, resetVersions, resetApp } from '@/utils/queryClient';
import request from './request';

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token: string }>('post', '/user/login', params),
  activate: (params: { token: string }) => request('post', '/user/activate', params),
  me: () => request<User>('get', '/user/me'),
  sendEmail: (params: { email: string }) => request('post', '/user/active/sendmail', params),
  resetpwdSendMail: (params: { email: string }) =>
    request('post', '/user/resetpwd/sendmail', params),
  register: (params: { [key: string]: string }) => request('post', '/user/register', params),
  resetPwd: (params: { token: string; newPwd: string }) =>
    request('post', '/user/resetpwd/reset', params),
  // app
  appList: () => request<{ data: App[] }>('get', '/app/list'),
  getApp: (appId: number) => request<App>('get', `/app/${appId}`),
  deleteApp: (appId: number) =>
    request('delete', `/app/${appId}`).finally(() => {
      resetAppList();
    }),
  createApp: (params: { name: string; platform: string }) =>
    request('post', '/app/create', params).finally(() => {
      resetAppList();
    }),
  updateApp: (appId: number, params: Omit<App, 'appKey' | 'checkCount' | 'id' | 'platform'>) =>
    request('put', `/app/${appId}`, params).finally(() => {
      resetAppList();
      resetApp(appId);
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
    params: { note?: string; status?: Package['status']; versionId?: number };
  }) =>
    request('put', `/app/${appId}/package/${packageId}`, params).finally(() => {
      resetPackages(appId);
    }),
  deletePackage: ({ appId, packageId }: { appId: number; packageId: number }) =>
    request('delete', `/app/${appId}/package/${packageId}`).finally(() => {
      resetPackages(appId);
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
    params: Omit<Version, 'id' | 'packages'>;
  }) =>
    request('put', `/app/${appId}/version/${versionId}`, { params }).finally(() => {
      resetVersions(appId);
    }),
  deleteVersion: ({ appId, versionId }: { appId: number; versionId: number }) =>
    request('delete', `/app/${appId}/version/${versionId}`).finally(() => {
      resetVersions(appId);
    }),
  // order
  createOrder: (params: { tier?: string }) =>
    request<{ payUrl: string }>('post', '/orders', params),
};
