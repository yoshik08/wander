// MEADOW Offline Service Worker
const CACHE_NAME = 'meadow-cache-v1';
const PRECACHE_URLS = [
  '/wander/',
  '/wander/index.html',
  '/wander/manifest.json',
  '/wander/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline shell');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache partial fail, continuing anyway', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests within /wander/ scope
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/wander/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached resource immediately and fetch fresh copy in background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Offline, cached version was already returned
        });
        return cachedResponse;
      }

      // Not in cache: fetch from network and cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/wander/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
