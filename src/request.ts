import { message } from "antd";
import store from "./store";

export default async function request(method: string, path: string, params?: any) {
  method = method.toUpperCase();
  let url = `https://update.reactnative.cn/api/${path}`;
  const headers: HeadersInit = {};
  const options: RequestInit = { method, headers };
  if (store.token) {
    headers["x-accesstoken"] = store.token;
  }
  if (params) {
    if (method == "GET") {
      params = Object.keys(params)
        .filter((key) => params[key] !== undefined)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`);
      url += "?" + params.join("&");
    } else {
      headers["content-type"] = "application/json";
      options.body = JSON.stringify(params);
    }
  }
  const response = await fetch(url, options);
  const json = await response.json();
  if (response.status == 200) {
    return json;
  }
  message.error(json.message);
  throw new RequestError(response.status, json.message);
}

export class RequestError {
  constructor(readonly code: number, readonly message: string) {}
}
