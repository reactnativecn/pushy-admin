import { useEffect, useState } from 'react';
import { safeStorage } from '@/utils/storage';

const CUSTOM_BASE_URL_STORAGE_KEY = 'pushy_custom_base_url';
const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);
export const customBaseUrlChangeEvent = 'pushy-custom-base-url-change';

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

export function getCustomBaseUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const val = safeStorage.get(CUSTOM_BASE_URL_STORAGE_KEY);
  return val ? val.trim() : null;
}

export function setCustomBaseUrl(baseUrl: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (baseUrl?.trim()) {
    safeStorage.set(CUSTOM_BASE_URL_STORAGE_KEY, baseUrl.trim());
  } else {
    safeStorage.remove(CUSTOM_BASE_URL_STORAGE_KEY);
  }
  window.dispatchEvent(
    new CustomEvent(customBaseUrlChangeEvent, {
      detail: baseUrl ? baseUrl.trim() : null,
    }),
  );
}

export function useCustomBaseUrl(): string | null {
  const [baseUrl, setBaseUrlState] = useState<string | null>(() =>
    getCustomBaseUrl(),
  );

  useEffect(() => {
    const handleCustomChange = (e: CustomEvent<string | null>) => {
      setBaseUrlState(e.detail ?? getCustomBaseUrl());
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CUSTOM_BASE_URL_STORAGE_KEY) {
        setBaseUrlState(getCustomBaseUrl());
      }
    };

    window.addEventListener(
      customBaseUrlChangeEvent as any,
      handleCustomChange as EventListener,
    );
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(
        customBaseUrlChangeEvent as any,
        handleCustomChange as EventListener,
      );
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return baseUrl;
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
