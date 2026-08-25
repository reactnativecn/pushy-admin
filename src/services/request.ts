import { message } from 'antd';
import i18n from '@/i18n';
import { getVersionHealthDevMock } from '@/services/version-health-dev-mock';
import { getCustomBaseUrl } from '@/utils/endpoint';
import { FEATURES } from '@/utils/features';
import { testUrls } from '@/utils/helper';
import { buildRequest, type HttpMethod } from './build-request';
import { handleResponse, RequestError, type RequestOptions } from './response';
import { getToken, usesCookieSession } from './session';
import { getWorkspaceAccountId } from './workspace';

// Session state lives in ./session; re-export the legacy surface so existing
// importers (auth, router, hooks, tests) keep working unchanged.
export {
  clearSession,
  getToken,
  hasSession,
  markCookieSession,
  setToken,
  usesCookieSession,
} from './session';
export type { RequestOptions };
export { RequestError };

const SERVER: { main: [string, ...string[]] } = {
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

const getBaseUrl = FEATURES.versionHealthMock
  ? Promise.resolve(SERVER.main[0])
  : testUrls(SERVER.main.map((url) => `${url}/status`)).then((ret) => {
      let baseUrl = SERVER.main[0];
      if (ret) {
        // remove /status
        baseUrl = ret.replace('/status', '');
      }
      return baseUrl;
    });

/**
 * 当前会话实际使用的 API 基址(自定义端点优先,否则用探测结果)。
 * 展示类页面(例如 MCP 端点)需要跟请求走同一个地址,不能自己拼常量:
 * 生产构建里 process.env.PUBLIC_API 根本不会被替换。
 */
export async function resolveApiBaseUrl(): Promise<string> {
  return getCustomBaseUrl() ?? (await getBaseUrl);
}

export default async function request<T extends Record<any, any>>(
  method: HttpMethod,
  path: string,
  params?: Record<any, any>,
  requestOptions: RequestOptions = {},
) {
  if (FEATURES.versionHealthMock) {
    const mock = getVersionHealthDevMock(method, path);
    if (mock !== null) {
      return mock as unknown as T;
    }
  }

  const baseUrl =
    requestOptions.baseUrl ?? getCustomBaseUrl() ?? (await getBaseUrl);
  const { url, options } = buildRequest({
    method,
    path,
    baseUrl,
    params,
    token: getToken(),
    accountId: getWorkspaceAccountId(),
    // Only send cookies once the server has switched us to a cookie session,
    // so current wildcard-CORS deployments keep working untouched.
    withCredentials: usesCookieSession(),
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
      (err as { handled?: boolean }).handled = true;
    }
    throw err;
  }
}
