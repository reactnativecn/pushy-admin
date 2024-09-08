import { message } from 'antd';
import md5 from 'blueimp-md5';
import { observable, runInAction } from 'mobx';
import { rootRouterPath, router } from './router';
import { api } from './services/api';
import request, { setToken, getToken } from './services/request';

const initState = {
  apps: observable.array<App>(),
  email: '',
};

type Store = typeof initState & { user?: User };

const store = observable.object<Store>(initState);

export default store;

export async function login(email: string, password: string) {
  store.email = email;
  const params = { email, pwd: md5(password) };
  try {
    const { token } = await api.login(params);
    setToken(token);
    message.success('登录成功');
    fetchUserInfo();
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
  store.user = undefined;
  router.navigate(rootRouterPath.login);
  localStorage.removeItem('token');
}

async function fetchUserInfo() {
  try {
    const user = await request('get', 'user/me');
    await fetchApps();
    runInAction(() => (store.user = user));
  } catch (_) {
    logout();
    message.error('登录已失效，请重新登录');
  }
}

export async function fetchApps() {
  const { data } = await request('get', 'app/list');
  runInAction(() => (store.apps = data));
}

function init() {
  if (getToken()) {
    return fetchUserInfo();
  }
}

init();
