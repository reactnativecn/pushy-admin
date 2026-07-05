import { message } from 'antd';
import i18n from '@/i18n';
import { testUrls } from '@/utils/helper';
import { buildRequest, type HttpMethod } from './build-request';
import { handleResponse, RequestError, type RequestOptions } from './response';

export type { RequestOptions };
export { RequestError };

// eslint-disable-next-line @typescript-eslint/naming-convention
let _token = localStorage.getItem('token');

export const setToken = (token: string) => {
  _token = token;
  localStorage.setItem('token', token);
};

export const getToken = () => _token;

const SERVER = {
  main:
    process.env.NODE_ENV === 'production'
      ? [
          'https://update.react-native.cn/api',
          'https://update.reactnative.cn/api',
          // "https://5.rnupdate.online/api",
        ]
      : [process.env.PUBLIC_API ?? 'http://localhost:9000'],
};

// const baseUrl = `http://localhost:9000`;
// let baseUrl = SERVER.main[0];
// const baseUrl = `https://p.reactnative.cn/api`;

const getBaseUrl = (async () => {
  return testUrls(SERVER.main.map((url) => `${url}/status`)).then((ret) => {
    let baseUrl = SERVER.main[0];
    if (ret) {
      // remove /status
      baseUrl = ret.replace('/status', '');
    }
    return baseUrl;
  });
})();

export default async function request<T extends Record<any, any>>(
  method: HttpMethod,
  path: string,
  params?: Record<any, any>,
  requestOptions: RequestOptions = {},
) {
  const baseUrl = requestOptions.baseUrl ?? (await getBaseUrl);
  const { url, options } = buildRequest({
    method,
    path,
    baseUrl,
    params,
    token: _token,
  });
  try {
    const response = await fetch(url, options);
    return await handleResponse<T>(response, requestOptions);
  } catch (err) {
    if (err instanceof RequestError) {
      throw err;
    }

    // Network-level failure (DNS, TLS, CORS, offline). The proxy hint is only
    // meaningful here, not for parsed business errors.
    if (!requestOptions.suppressErrorToast) {
      message.error(
        i18n.t('request.error', { message: (err as Error).message }),
      );
      message.error(i18n.t('request.proxy_hint'));
    }
    throw err;
  }
}
