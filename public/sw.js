// GenRob Offline-First Service Worker
const CACHE_NAME = 'genrob-kirana-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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

  // ── Bypass: Vite dev-server internals ─────────────────────────
  // Plain `return` (no event.respondWith) tells the browser to handle
  // the request itself. DO NOT use `return fetch(...)` here — the SW
  // already owns the FetchEvent and a bare return-value is ignored,
  // which causes "Failed to convert value to Response" errors.
  if (url.includes('localhost:5174') ||
      url.includes('/@vite/') ||
      url.includes('/@react-refresh')) {
    return; // browser handles it natively
  }

  // ── Bypass: Supabase REST / Realtime / Edge Functions ─────────
  // These are live API calls that must never be cached or intercepted.
  if (url.includes('supabase.co') ||
      url.includes('/functions/v1/') ||
      url.includes('/rest/v1/') ||
      url.includes('/auth/v1/') ||
      url.includes('/realtime/v1/')) {
    return; // browser handles it natively
  }

  // ── Cache-first for all other static assets ───────────────────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
