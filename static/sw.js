/**
 * FlashCards PWA Service Worker
 * Runtime-caching strategy compatible with Vite's hashed asset filenames.
 * Bump CACHE_VERSION when deploying breaking changes.
 */
const CACHE_VERSION = '3';
const CACHE_NAME = `flashcards-v${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('flashcards-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isAppAsset =
    url.origin === self.location.origin || url.href.includes('jspdf');

  if (!isAppAsset) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    const path = url.pathname || '/';
    const canonical = new Request(url.origin + (path.startsWith('/') ? path : '/' + path));

    if (url.searchParams.has('nocache') || url.searchParams.has('update')) {
      event.respondWith(
        fetch(request, { cache: 'reload' }).then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(canonical, res.clone()));
          return res;
        }),
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(canonical, res.clone()));
          return res;
        })
        .catch(() => caches.match(canonical)),
    );
    return;
  }

  // Bundled sets: network-first so latest data is always served
  if (url.pathname.endsWith('/bundled-sets.js')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // All other app assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
  );
});
