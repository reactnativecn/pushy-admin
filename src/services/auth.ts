/* eslint-disable @typescript-eslint/naming-convention */
import { message } from 'antd';
import { md5 } from 'hash-wasm';
import i18n from '@/i18n';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import {
  clearSession,
  markCookieSession,
  RequestError,
  setToken,
  usesCookieSession,
} from '@/services/request';
import { resolveLoginRedirect } from '@/utils/safe-redirect';
import { clearWorkspace } from './workspace';

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
  // A fresh identity must not inherit the previous user's workspace selection
  clearWorkspace();
  const params = { email, pwd: await md5(password) };
  try {
    const res = await api.login(params);
    if (!res) {
      return;
    }
    if (res.token) {
      setToken(res.token);
    } else {
      // Token-less 2xx: the server established an httpOnly cookie session.
      markCookieSession();
    }
    message.success(i18n.t('login.success'));
    router.navigate(resolveLoginRedirect(getSearchParam('loginFrom')));
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
  if (usesCookieSession()) {
    // Best-effort: ask the server to clear the httpOnly cookie. Tolerates
    // servers without the endpoint (404) or an already-dead session. A 401
    // here re-enters logout(), which terminates immediately because
    // clearSession() below has already dropped the cookie-session flag.
    api.logout().catch(() => {});
  }
  clearSession();
  clearWorkspace();
  if (currentPath !== rootRouterPath.login) {
    router.navigate(rootRouterPath.login);
  }
  window.location.reload();
}
