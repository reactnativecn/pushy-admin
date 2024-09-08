import request from './request';

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token: string }>('post', 'user/login', params),
};
