export const LEGACY_PUSHY_CACHE_PREFIX = 'pushy-admin-';

interface ServiceWorkerRegistrationLike {
  unregister: () => Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations: () => Promise<ServiceWorkerRegistrationLike[]>;
}

interface CacheStorageLike {
  delete: (cacheName: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
}

const getServiceWorkerContainer = (): ServiceWorkerContainerLike | undefined => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }
  return navigator.serviceWorker;
};

const getCacheStorage = (): CacheStorageLike | undefined =>
  typeof caches === 'undefined' ? undefined : caches;

/**
 * Remove registrations and runtime caches left by the retired PWA layer.
 * Every branch is best-effort so a browser implementation error cannot block
 * the management console from starting.
 */
export async function retireLegacyPwaState({
  serviceWorker = getServiceWorkerContainer(),
  cacheStorage = getCacheStorage(),
}: {
  serviceWorker?: ServiceWorkerContainerLike;
  cacheStorage?: CacheStorageLike;
} = {}): Promise<void> {
  const cleanupTasks: Promise<unknown>[] = [];

  if (serviceWorker) {
    cleanupTasks.push(
      serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.allSettled(
            registrations.map((registration) => registration.unregister()),
          ),
        ),
    );
  }

  if (cacheStorage) {
    cleanupTasks.push(
      cacheStorage.keys().then((keys) =>
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
