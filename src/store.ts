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
  const response = await request("post", "user/login", params);
  if (response.token) {
    runInAction(() => (store.token = response.token));
    localStorage.setItem("token", response.token);
    message.success("登录成功");
    fetchUserInfo();
  } else {
    message.error(response.message);
  }
}

export function logout() {
  store.token = undefined;
  localStorage.removeItem("token");
}

async function fetchUserInfo() {
  const user = await request("get", "user/me");
  if (user.message == "Unauthorized") {
    logout();
    message.error("登录已失效，请重新登录");
  } else {
    runInAction(() => (store.user = user));
    fetchApps();
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
