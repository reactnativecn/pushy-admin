import { message } from "antd";
import { History } from "history";
import md5 from "md5";
import { observable, runInAction } from "mobx";
import request from "./request";

const initState = {
  apps: observable.array<App>(),
  token: localStorage.getItem("token"),
};

type Store = typeof initState & { user?: User; history?: History };

const store = observable.object<Store>(initState);

export default store;

export async function login(email: string, password: string) {
  const params = { email, pwd: md5(password) };
  try {
    const { token } = await request("post", "user/login", params);
    runInAction(() => (store.token = token));
    localStorage.setItem("token", token);
    message.success("登录成功");
    fetchUserInfo();
  } catch (e) {
    message.error(e.message);
  }
}

export function logout() {
  store.token = null;
  localStorage.removeItem("token");
}

async function fetchUserInfo() {
  try {
    const user = await request("get", "user/me");
    await fetchApps();
    runInAction(() => (store.user = user));
  } catch ({ message }) {
    // logout();
    message.error("登录已失效，请重新登录");
  }
}

export async function fetchApps() {
  const { data } = await request("get", "app/list");
  runInAction(() => (store.apps = data));
}

function init() {
  if (store.token) {
    return fetchUserInfo();
  }
}

init();
