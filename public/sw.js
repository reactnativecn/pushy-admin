const CACHE_NAME = 'pushy-admin-v2';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const IS_LOCAL_HOST = LOCAL_HOSTNAMES.has(self.location.hostname);

// Install: activate this worker immediately without precaching the app shell.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => IS_LOCAL_HOST || k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  if (IS_LOCAL_HOST) {
    event.waitUntil(self.registration.unregister());
  }
  self.clients.claim();
});

const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.headers.get('accept') || '').includes('text/html');

// Fetch: keep HTML/API fresh; cache only fingerprinted static assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  if (IS_LOCAL_HOST) {
    event.respondWith(fetch(request));
    return;
  }

  if (
    url.origin !== self.location.origin ||
    isNavigationRequest(request) ||
    url.pathname === '/index.html' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/api')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  if (!url.pathname.startsWith('/static/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
