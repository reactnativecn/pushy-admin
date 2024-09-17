import request from './request';

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token: string }>('post', '/user/login', params),
  activate: (params: { token: string }) => request('post', '/user/activate', params),
  me: () => request<User>('get', '/user/me'),
  appList: () => request<{ data: App[] }>('get', '/app/list'),
  sendEmail: (params: { email: string }) => request('post', '/user/active/sendmail', params),
  resetpwdSendMail: (params: { email: string }) =>
    request('post', '/user/resetpwd/sendmail', params),
  register: (params: { [key: string]: string }) => request('post', '/user/register', params),
  getAppData: (id: number) => request('get', `/app/${id}`),
  getPackages: (id: number) => request('get', `/app/${id}/package/list?limit=1000`),
  // getversions: (id: number, page?: number, pageSize?: number) => {
  //   if (page === undefined) {
  //     page = 1;
  //   }
  //   const params = `offset=${(page - 1) * pageSize!}&limit=${pageSize}`;
  //   return request('get', `/app/${id}/version/list?${params}`);
  // },
};
