/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import md5 from 'blueimp-md5';
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
    const res = await api.login(params);
    if (res?.token) {
      setToken(res.token);
      message.success('登录成功');
      const loginFrom = new URLSearchParams(window.location.search).get(
        'loginFrom',
      );
      window.location.href = loginFrom || '/user';
    }
  } catch (err) {
    const e = err as Error;
    if (e.message.startsWith('423:')) {
      window.location.href = '/inactivated';
    } else {
      message.error(e.message);
    }
  }
}

export function logout() {
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    setToken('');
    window.location.href = '/login';
    window.location.reload();
  }
}
