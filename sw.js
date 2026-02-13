/**
 * FlashCards PWA Service Worker – caches app shell and assets for offline use.
 * Bump CACHE_VERSION when you deploy new JS/CSS so clients get updates.
 */
const CACHE_VERSION = '1';
const CACHE_NAME = `flashcards-v${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/bundled-sets.js',
  '/manifest.webmanifest',
  '/img/logo.png',
  '/img/sandy-bowling-approved.png',
  '/img/sandy-bowling-approved-256.png',
  '/img/sandy-bowling-approved.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))).catch(() => {
        // If any precache fails (e.g. offline during first install), continue
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k.startsWith('flashcards-') && k !== CACHE_NAME).map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Same-origin app assets and the jspdf CDN: cache-first so offline works
  const isAppAsset = url.origin === self.location.origin || url.href.includes('jspdf');
  if (isAppAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Everything else: network first (e.g. future API calls)
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
