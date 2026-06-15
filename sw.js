const CACHE_NAME = 'kartoney-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/site.webmanifest',
  '/images/favicon.ico',
  '/images/favicon-192x192.png',
  '/images/favicon-512x512.png',
  'https://sql.js.org/dist/sql-wasm.js',
  'https://sql.js.org/dist/sql-wasm.wasm',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Be+Vietnam+Pro:wght@400;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// 1. Install Event: Cache Core Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Serve from Cache or Network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Exclude Adsterra / Analytics scripts from SW caching to prevent issues
  if (requestUrl.host.includes('profitablecpmratenetwork.com')) {
    return;
  }

  // Strategy for Data (SQLite DB) - Network First, fallback to cache
  if (requestUrl.pathname.includes('/data/kartoney.db')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Strategy for Images - Cache First, fallback to network
  if (requestUrl.pathname.match(/\.(png|jpg|jpeg|svg|gif)$/) || requestUrl.host.includes('servallvid.com')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
             return networkResponse;
          }
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default Strategy (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      }).catch(err => {
        // console.warn('Network request failed, serving from cache if available', err);
      });
      return cachedResponse || fetchPromise;
    })
  );
});
