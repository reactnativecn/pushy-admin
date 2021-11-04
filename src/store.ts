import { message } from "antd";
import md5 from "md5";
import { observable, runInAction } from "mobx";
import { NavigateFunction } from "react-router-dom";
import request, { RequestError } from "./request";

const initState = {
  apps: observable.array<App>(),
  token: localStorage.getItem("token"),
  email: "",
  navigate: () => {},
};

type Store = typeof initState & { user?: User; navigate: NavigateFunction };

const store = observable.object<Store>(initState);

export default store;

export async function login(email: string, password: string) {
  store.email = email;
  const params = { email, pwd: md5(password) };
  try {
    const { token } = await request("post", "user/login", params);
    runInAction(() => (store.token = token));
    localStorage.setItem("token", token);
    message.success("登录成功");
    fetchUserInfo();
  } catch (e) {
    if (e instanceof RequestError) {
      if (e.code == 423) {
        store.navigate("/inactivated");
      } else {
        message.error(e.message);
      }
    }
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
  } catch (_) {
    logout();
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
