// GenRob Offline-First Service Worker
const CACHE_NAME = 'genrob-kirana-v2';

self.addEventListener('install', (event) => {
  const scope = self.registration.scope;
  const staticAssets = [
    scope,
    scope + 'index.html',
    scope + 'manifest.json',
    scope + 'favicon.svg'
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(staticAssets).catch((err) => {
        console.warn('SW pre-cache notice (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ── Bypass: Vite dev-server & hot-reload internals ────────────
  if (url.includes('/@vite/') ||
      url.includes('/@react-refresh') ||
      url.includes('localhost:517')) {
    return; // Let browser handle dev requests natively
  }

  // ── Bypass: Supabase & Edge APIs ──────────────────────────────
  if (url.includes('supabase.co') ||
      url.includes('/functions/v1/') ||
      url.includes('/rest/v1/') ||
      url.includes('/auth/v1/') ||
      url.includes('/realtime/v1/')) {
    return;
  }

  // Non-GET requests should not be intercepted
  if (event.request.method !== 'GET') {
    return;
  }

  // ── Cache-first strategy for static assets ────────────────────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic' &&
            (url.includes('.js') || url.includes('.css') || url.includes('.svg') || url.includes('.png') || url.includes('.woff2'))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(self.registration.scope + 'index.html');
          }
        });
    })
  );
});
