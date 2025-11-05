import { message } from "antd";
import { testUrls } from "@/utils/helper";
import { logout } from "./auth";

// eslint-disable-next-line @typescript-eslint/naming-convention
let _token = localStorage.getItem("token");

export const setToken = (token: string) => {
  _token = token;
  localStorage.setItem("token", token);
};

export const getToken = () => _token;

const SERVER = {
  main: [
    // "http://localhost:9000",
    "https://update.react-native.cn/api",
    "https://update.reactnative.cn/api",
    // "https://5.rnupdate.online/api",
  ],
};

// const baseUrl = `http://localhost:9000`;
// let baseUrl = SERVER.main[0];
// const baseUrl = `https://p.reactnative.cn/api`;

const getBaseUrl = (async () => {
  return testUrls(SERVER.main.map((url) => `${url}/status`)).then((ret) => {
    let baseUrl = SERVER.main[0];
    if (ret) {
      // remove /status
      baseUrl = ret.replace("/status", "");
    }
    console.log("baseUrl", baseUrl);
    return baseUrl;
  });
})();

interface PushyResponse {
  message?: string;
}

export default async function request<T extends Record<any, any>>(
  method: "get" | "post" | "put" | "delete",
  path: string,
  params?: Record<any, any>
) {
  const headers: HeadersInit = {};
  const options: RequestInit = { method, headers };
  const baseUrl = await getBaseUrl;
  let url = `${baseUrl}${path}`;
  if (_token) {
    headers["x-accesstoken"] = _token;
  }
  if (params) {
    if (method === "get") {
      url += `?${new URLSearchParams(params).toString()}`;
    } else {
      headers["content-type"] = "application/json";
      options.body = JSON.stringify(params);
    }
  }
  try {
    const response = await fetch(url, options);
    if (response.status === 401) {
      logout();
      return;
    }
    // TODO token 过期
    const json = (await response.json()) as PushyResponse;
    if (response.status === 200) {
      return json as T & PushyResponse;
    }

    message.error(json.message);
    throw Error(`${response.status}: ${json.message}`);
  } catch (err) {
    if ((err as Error).message.includes("Unauthorized")) {
      logout();
    } else {
      message.error(`错误：${(err as Error).message}`);
      message.error("如有使用代理，请关闭代理后重试");
      throw err;
    }
  }
}
