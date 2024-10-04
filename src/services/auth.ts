/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import md5 from 'blueimp-md5';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { setToken } from '@/services/request';

let _email = '';
export const setUserEmail = (email: string) => {
  _email = email;
};

export const getUserEmail = () => _email;

export async function login(email: string, password: string) {
  _email = email;
  const params = { email, pwd: md5(password) };
  try {
    const { token } = await api.login(params);
    setToken(token);
    message.success('登录成功');
    const loginFrom = new URLSearchParams(window.location.search).get('loginFrom');
    router.navigate(loginFrom || rootRouterPath.user);
  } catch (err) {
    const e = err as Error;
    if (e.message.startsWith('423:')) {
      router.navigate(rootRouterPath.inactivated);
    } else {
      message.error(e.message);
    }
  }
}

export function logout() {
  if (router.state.location.pathname !== rootRouterPath.login) {
    setToken('');
    router.navigate(rootRouterPath.login);
    window.location.reload();
  }
}
