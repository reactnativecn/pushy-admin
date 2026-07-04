import { message } from 'antd';
import { logout } from './auth';

export interface PushyResponse {
  message?: string;
}

export class RequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

export interface RequestOptions {
  baseUrl?: string;
  suppressErrorToast?: boolean;
}

/**
 * Turn a fetch Response into the parsed payload, or throw a RequestError.
 *
 * Kept separate from the request/fetch plumbing so the branchy error handling
 * (401, non-2xx, non-JSON bodies) is unit-testable without hitting the network.
 */
export async function handleResponse<T extends Record<any, any>>(
  response: Response,
  requestOptions: RequestOptions = {},
): Promise<T & PushyResponse> {
  if (response.status === 401) {
    logout();
    // Throw instead of resolving undefined: callers chain `.then()` to run
    // optimistic cache updates, which must NOT run when the request was
    // rejected as unauthorized.
    throw new RequestError('Unauthorized', 401);
  }

  // Only parse JSON when the server actually returned JSON. A 204/empty body or
  // an HTML error page (e.g. from a gateway/proxy) would otherwise make
  // response.json() throw a SyntaxError that gets misreported downstream.
  const contentType = response.headers.get('content-type') ?? '';
  const json = (
    contentType.includes('application/json') ? await response.json() : {}
  ) as PushyResponse;

  if (response.ok) {
    return json as T & PushyResponse;
  }

  const error = new RequestError(
    json.message || `Request failed with status ${response.status}`,
    response.status,
  );
  if (!requestOptions.suppressErrorToast && error.message) {
    message.error(error.message);
  }
  throw error;
}
