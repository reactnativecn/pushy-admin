export const LEGACY_PUSHY_CACHE_PREFIX = 'pushy-admin-';

interface ServiceWorkerLike {
  scriptURL: string;
}

interface ServiceWorkerRegistrationLike {
  active?: ServiceWorkerLike | null;
  installing?: ServiceWorkerLike | null;
  waiting?: ServiceWorkerLike | null;
  unregister: () => Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations: () => Promise<readonly ServiceWorkerRegistrationLike[]>;
}

interface CacheStorageLike {
  delete: (cacheName: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
}

const getServiceWorkerContainer = ():
  | ServiceWorkerContainerLike
  | undefined => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }
  return navigator.serviceWorker;
};

const getCacheStorage = (): CacheStorageLike | undefined =>
  typeof caches === 'undefined' ? undefined : caches;

const getPageOrigin = (): string | undefined =>
  typeof window === 'undefined' ? undefined : window.location.origin;

/**
 * Identify the retired root-level Pushy worker without touching registrations
 * owned by another application that happens to share the same origin.
 */
export function isLegacyPushyRegistration(
  registration: ServiceWorkerRegistrationLike,
  pageOrigin: string | undefined,
): boolean {
  if (!pageOrigin) {
    return false;
  }

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(pageOrigin).origin;
  } catch {
    return false;
  }

  return [registration.active, registration.waiting, registration.installing]
    .filter((worker): worker is ServiceWorkerLike => Boolean(worker?.scriptURL))
    .some((worker) => {
      try {
        const scriptUrl = new URL(worker.scriptURL, normalizedOrigin);
        return (
          scriptUrl.origin === normalizedOrigin &&
          scriptUrl.pathname === '/sw.js'
        );
      } catch {
        return false;
      }
    });
}

/**
 * Remove registrations and runtime caches left by the retired PWA layer.
 * Every branch is best-effort so a browser implementation error cannot block
 * the management console from starting.
 */
export async function retireLegacyPwaState({
  serviceWorker = getServiceWorkerContainer(),
  cacheStorage = getCacheStorage(),
  pageOrigin = getPageOrigin(),
}: {
  serviceWorker?: ServiceWorkerContainerLike;
  cacheStorage?: CacheStorageLike;
  pageOrigin?: string;
} = {}): Promise<void> {
  const cleanupTasks: Promise<unknown>[] = [];

  if (serviceWorker) {
    cleanupTasks.push(
      serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.allSettled(
            registrations
              .filter((registration) =>
                isLegacyPushyRegistration(registration, pageOrigin),
              )
              .map((registration) => registration.unregister()),
          ),
        ),
    );
  }

  if (cacheStorage) {
    cleanupTasks.push(
      cacheStorage
        .keys()
        .then((keys) =>
          Promise.allSettled(
            keys
              .filter((key) => key.startsWith(LEGACY_PUSHY_CACHE_PREFIX))
              .map((key) => cacheStorage.delete(key)),
          ),
        ),
    );
  }

  await Promise.allSettled(cleanupTasks);
}
