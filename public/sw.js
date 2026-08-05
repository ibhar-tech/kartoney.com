/* Kartoney service worker — static multi-page site.
 * Network-first for HTML (always fresh pages), cache-first for static assets.
 * __ASSET_V__ is substituted by src/build.mjs with a hash of the CSS/JS bundle,
 * so any change to them both busts the precache URLs and rotates CACHE_NAME —
 * which drops every stale entry on activate. */
const CACHE_NAME = 'kartoney-__ASSET_V__';
const PRECACHE = ['/', '/css/style.css?v=__ASSET_V__', '/js/main.js?v=__ASSET_V__', '/site.webmanifest', '/fonts/cairo-arabic.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  // Never intercept ad networks or cross-origin video.
  if (u.origin !== self.location.origin) {
    if (u.host.includes('servallvid.com') && req.destination === 'image') {
      event.respondWith(cacheFirst(req));
    }
    return;
  }

  // HTML navigations → network-first (fresh content), fall back to cache offline.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Same-origin static assets → cache-first.
  event.respondWith(cacheFirst(req));
});

function cacheFirst(req) {
  return caches.match(req).then(
    (cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      })
  );
}
