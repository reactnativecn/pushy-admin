export type HttpMethod = 'get' | 'post' | 'put' | 'delete';

/**
 * Pure request construction (url + fetch options), extracted from request.ts
 * so it can be unit-tested without the network/toast side effects there.
 */
export function buildRequest({
  method,
  path,
  baseUrl,
  params,
  token,
  accountId,
  withCredentials,
}: {
  method: HttpMethod;
  path: string;
  baseUrl: string;
  params?: Record<string, any>;
  token?: string | null;
  /** Selected workspace account id; sent as x-account-id when present. */
  accountId?: number | null;
  /** Send cookies cross-origin — required for httpOnly-cookie sessions. */
  withCredentials?: boolean;
}): { url: string; options: RequestInit } {
  const headers: Record<string, string> = {};
  const options: RequestInit = { method, headers };
  if (withCredentials) {
    options.credentials = 'include';
  }
  let url = `${baseUrl.replace(/\/$/, '')}${path}`;
  if (token) {
    headers['x-accesstoken'] = token;
  }
  if (accountId) {
    headers['x-account-id'] = String(accountId);
  }
  if (params) {
    if (method === 'get') {
      url += `?${new URLSearchParams(params).toString()}`;
    } else {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(params);
    }
  }
  return { url, options };
}
