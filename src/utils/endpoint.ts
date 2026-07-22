import { useEffect, useState } from 'react';

const CUSTOM_BASE_URL_STORAGE_KEY = 'pushy_custom_base_url';
export const customBaseUrlChangeEvent = 'pushy-custom-base-url-change';

export function getCustomBaseUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const val = window.localStorage.getItem(CUSTOM_BASE_URL_STORAGE_KEY);
  return val ? val.trim() : null;
}

export function setCustomBaseUrl(baseUrl: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (baseUrl && baseUrl.trim()) {
    window.localStorage.setItem(CUSTOM_BASE_URL_STORAGE_KEY, baseUrl.trim());
  } else {
    window.localStorage.removeItem(CUSTOM_BASE_URL_STORAGE_KEY);
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
  try {
    const cleanUrl = baseUrl.trim().replace(/\/$/, '');
    const testUrl = `${cleanUrl}/status`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
