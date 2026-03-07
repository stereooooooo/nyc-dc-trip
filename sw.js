const CACHE_NAME = 'browns-trip-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Google Maps requests pass through to network (won't work offline)
  if (url.hostname.includes('google.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  // Let Apple Maps links pass through
  if (url.hostname.includes('apple.com')) {
    return;
  }

  // For our own assets: cache-first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses for future offline use
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // If both cache and network fail, return the cached index page
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
