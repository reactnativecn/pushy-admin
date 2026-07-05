/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import { md5 } from 'hash-wasm';
import i18n from '@/i18n';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { RequestError, setToken } from '@/services/request';
import { resolveLoginRedirect } from '@/utils/safe-redirect';

let _email = '';
export const setUserEmail = (email: string) => {
  _email = email;
};

export const getUserEmail = () => _email;

function getSearchParam(name: string) {
  return new URLSearchParams(router.state.location.search).get(name);
}

export async function login(email: string, password: string) {
  _email = email;
  const params = { email, pwd: await md5(password) };
  try {
    const res = await api.login(params);
    if (res?.token) {
      setToken(res.token);
      message.success(i18n.t('login.success'));
      router.navigate(resolveLoginRedirect(getSearchParam('loginFrom')));
    }
  } catch (err) {
    if (err instanceof RequestError && err.status === 423) {
      router.navigate(rootRouterPath.inactivated);
    } else {
      const errorMessage =
        err instanceof Error ? err.message : i18n.t('login.failed');
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
