import store from "./store";

export default async function request(
  method: string,
  path: string,
  params?: any
) {
  method = method.toUpperCase();
  let url = `/api/${path}`;
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
  return await response.json();
}
