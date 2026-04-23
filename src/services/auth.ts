/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import { md5 } from 'hash-wasm';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { RequestError, setToken } from '@/services/request';

let _email = '';
export const setUserEmail = (email: string) => {
  _email = email;
};

export const getUserEmail = () => _email;

function getSearchParam(name: string) {
  return new URLSearchParams(router.state.location.search).get(name);
}

function resolveLoginFrom(loginFrom?: string | null) {
  if (!loginFrom?.startsWith('/') || loginFrom.startsWith('//')) {
    return rootRouterPath.user;
  }
  if (
    loginFrom === rootRouterPath.login ||
    loginFrom.startsWith(`${rootRouterPath.login}?`)
  ) {
    return rootRouterPath.user;
  }
  return loginFrom;
}

export async function login(email: string, password: string) {
  _email = email;
  const params = { email, pwd: await md5(password) };
  try {
    const res = await api.login(params);
    if (res?.token) {
      setToken(res.token);
      message.success('登录成功');
      router.navigate(resolveLoginFrom(getSearchParam('loginFrom')));
    }
  } catch (err) {
    if (err instanceof RequestError && err.status === 423) {
      router.navigate(rootRouterPath.inactivated);
    } else {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      message.error(errorMessage);
    }
  }
}

export function logout() {
  const currentPath = router.state.location.pathname;
  setToken('');
  if (currentPath !== rootRouterPath.login) {
    router.navigate(rootRouterPath.login);
  }
  window.location.reload();
}
