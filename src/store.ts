import { message } from 'antd';
import md5 from 'blueimp-md5';
import { observable } from 'mobx';
import { rootRouterPath, router } from './router';
import { api } from './services/api';
import { setToken } from './services/request';
import { resetAllQueries } from '@/utils/queryClient';

const initState = {
  email: '',
};

type Store = typeof initState;

const store = observable.object<Store>(initState);

export default store;

export async function login(email: string, password: string) {
  store.email = email;
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
  setToken('');
  router.navigate(rootRouterPath.login);
  resetAllQueries();
}
