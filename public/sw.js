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
  // Bypass Service Worker for Vite dev server requests (e.g., @vite/client, @react-refresh, source files)
  if (event.request.url.includes('localhost:5174')) {
    return fetch(event.request);
  }
  // Server requests for Supabase APIs or Edge Functions are never cached – let them run live.
  if (event.request.url.includes('supabase.co') || event.request.url.includes('/functions/v1/')) {
    return fetch(event.request);
  }
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
