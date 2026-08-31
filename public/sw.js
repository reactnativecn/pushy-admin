const LEGACY_CACHE_PREFIX = 'pushy-admin-';

// Tombstone worker for browsers that still have an older pushy-admin service
// worker registered. It deliberately has no fetch handler: fingerprinted assets
// use the browser's normal HTTP cache, while every navigation stays network-led.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(
          keys
            .filter((key) => key.startsWith(LEGACY_CACHE_PREFIX))
            .map((key) => caches.delete(key)),
        );
      } catch {
        // Cache enumeration is best-effort; retirement must still continue.
      }

      try {
        await self.registration.unregister();
      } catch {
        // A later page load will retry retirement through the application code.
      }
    })(),
  );
});
