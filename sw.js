// Robust service worker with offline caching to satisfy PWA installability & offline requirements
const CACHE_NAME = 'diaryflow-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/screenshot_mobile.jpg',
  '/screenshot_desktop.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-caching assets failed, caching individually:', err);
        // Cache assets one by one to ensure failure of one doesn't break everything
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
  // Bypass service worker interception for all API requests and non-GET requests
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first strategy with cache fallback for HTML and app shell assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for GET requests
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no cache match and we are offline, we can serve a default offline page/index
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
