// Robust service worker with offline caching to satisfy PWA installability & offline requirements
const CACHE_NAME = 'sadiary-offline-v12';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-sa-diary.png',
  '/logo-sa-diary-192.png',
  '/logo-sa-diary-512.png',
  '/logo-sa-diary-maskable-192.png',
  '/logo-sa-diary-maskable-512.png',
  '/screenshot_mobile.jpg',
  '/screenshot_desktop.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-caching assets failed, caching individually:', err);
        return Promise.all(
          ASSETS_TO_CACHE.map((asset) => {
            return cache.add(asset).catch((e) => console.log(`Failed to cache asset ${asset}:`, e));
          })
        );
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Bypass service worker interception for all internal API requests, Vite dev endpoints, and modules
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/@') ||
    event.request.url.includes('/node_modules/') ||
    event.request.url.includes('?v=') ||
    event.request.url.includes('.hot-update') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Cache-first for hashed static bundle assets (vite chunk assets)
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first strategy with cache fallback for HTML, navigation and general assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/') || caches.match('/index.html');
          }
        });
      })
  );
});
