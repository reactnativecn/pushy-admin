import { message } from 'antd';
import { logout } from './auth';

// eslint-disable-next-line @typescript-eslint/naming-convention
let _token = localStorage.getItem('token');

export const setToken = (token: string) => {
  _token = token;
  localStorage.setItem('token', token);
};

export const getToken = () => _token;

// const baseUrl = `http://localhost:9000`;
const baseUrl = `https://update.react-native.cn/api`;
// const baseUrl = `https://p.reactnative.cn/api`;
// const baseUrl = `http://k.reactnative.cn/api`;

interface PushyResponse {
  message?: string;
}

export default async function request<T extends Record<any, any>>(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  params?: Record<any, any>
) {
  const headers: HeadersInit = {};
  const options: RequestInit = { method, headers };
  let url = `${baseUrl}${path}`;
  if (_token) {
    headers['x-accesstoken'] = _token;
  }
  if (params) {
    if (method === 'get') {
      url += `?${new URLSearchParams(params).toString()}`;
    } else {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(params);
    }
  }
  try {
    const response = await fetch(url, options);
    // TODO token 过期
    const json = (await response.json()) as PushyResponse;
    if (response.status === 200) {
      return json as T & PushyResponse;
    }
    if (response.status === 401) {
      logout();
    } else {
      message.error(json.message);
      throw new Error(`${response.status}: ${json.message}`);
    }
  } catch (err) {
    message.error((err as Error).message);
    throw err;
  }
}
