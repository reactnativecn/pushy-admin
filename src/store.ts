import { message } from "antd";
import md5 from "blueimp-md5";
import { observable, runInAction, IObservableArray } from "mobx";
import request from "./request";
import { User, App } from "./types";

interface Store {
  token?: string;
  user?: User;
  apps: IObservableArray<App>;
}

const store = observable.object<Store>({
  token: localStorage.getItem("token") ?? undefined,
  apps: observable.array(),
});

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
  store.token = undefined;
  localStorage.removeItem("token");
}

async function fetchUserInfo() {
  try {
    const user = await request("get", "user/me");
    runInAction(() => (store.user = user));
    fetchApps();
  } catch (_) {
    logout();
    message.error("登录已失效，请重新登录");
  }
}

async function fetchApps() {
  const { data } = await request("get", "app/list");
  runInAction(() => (store.apps = data));
}

export function init() {
  if (store.token) {
    return fetchUserInfo();
  }
}
