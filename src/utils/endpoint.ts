import {
  createStoredPreference,
  useStoredPreference,
} from '@/utils/stored-preference';

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

// 用户自选的接口地址；没选时为 null，走默认地址
const customBaseUrlPreference = createStoredPreference<string | null>({
  changeEvent: 'pushy-custom-base-url-change',
  key: 'pushy_custom_base_url',
  parse: (raw) => (raw ? raw.trim() : null),
  serialize: (baseUrl) => baseUrl?.trim() || null,
});

/**
 * Canonicalize a custom API base URL and reject values that would either be
 * blocked as mixed content or conceal credentials/query data in the endpoint.
 * Plain HTTP remains available for local development only.
 */
export function normalizeEndpointUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const isLocal = LOCAL_HOSTNAMES.has(url.hostname);
    const protocolAllowed =
      url.protocol === 'https:' || (url.protocol === 'http:' && isLocal);
    if (
      !protocolAllowed ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const pathname = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

/**
 * Compare a normalized endpoint choice with the persisted selection. An
 * invalid, non-null legacy value is deliberately not equal to the default
 * selection so resetting still removes it from storage and clears old state.
 */
export function isEndpointSelectionUnchanged(
  currentCustomUrl: string | null,
  nextUrl: string | null,
): boolean {
  if (nextUrl === null) {
    return currentCustomUrl === null;
  }
  return (
    currentCustomUrl !== null &&
    normalizeEndpointUrl(currentCustomUrl) === nextUrl
  );
}

export function getCustomBaseUrl(): string | null {
  return customBaseUrlPreference.get();
}

export function setCustomBaseUrl(baseUrl: string | null): void {
  customBaseUrlPreference.set(baseUrl);
}

export function useCustomBaseUrl(): string | null {
  return useStoredPreference(customBaseUrlPreference);
}

export async function testEndpointStatus(baseUrl: string): Promise<boolean> {
  const normalizedUrl = normalizeEndpointUrl(baseUrl);
  if (!normalizedUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${normalizedUrl}/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
