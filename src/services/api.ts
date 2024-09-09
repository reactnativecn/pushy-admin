import request from './request';

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token: string }>('post', '/user/login', params),
  activate: (params: { token: string }) => request('post', '/user/activate', params),
  me: () => request<User>('get', '/user/me'),
  appList: () => request<{ data: App[] }>('get', '/app/list'),
};
