// ══════════════════════════════════════════════════════════
// ALFIJEER — SERVICE WORKER
// Strategy:
//  • App shell (HTML/CSS/JS/icons) → cache-first, so the app
//    still opens instantly when offline.
//  • API calls (anything to the Railway backend) → always
//    network, never cached — shop/product/order data must be fresh.
//  • Any failed navigation while offline → falls back to offline.html.
//
// Bump CACHE_VERSION whenever you change any cached file, so
// returning visitors pick up the new version instead of a stale cache.
// ══════════════════════════════════════════════════════════

const CACHE_VERSION = 'alfijeer-v2'; // bumped from arewa-square-v1 for the rebrand — forces returning visitors to pull fresh (correctly-branded) assets instead of serving stale cached ones
const API_HOST = 'arewa-square-backend-production.up.railway.app';

const APP_SHELL = [
  './index.html',
  './auth.html',
  './reset-password.html',
  './buyer-dashboard.html',
  './seller-dashboard.html',
  './shop-detail.html',
  './directions.html',
  './terms.html',
  './privacy.html',
  './seller-rules.html',
  './404.html',
  './offline.html',
  './api.js',
  './orders-ui.js',
  './google-maps-config.js',
  './manifest.json',
  './Alfijeer1.png',
];

// ── Install: pre-cache the app shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll fails entirely if even one file 404s, so cache what we can
      // individually instead of letting one missing asset block installation.
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => console.warn('[sw] skip caching', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: clear out old cache versions ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: route requests based on type ──
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never touch non-GET requests (POST/PUT/DELETE) — always go straight to network.
  if (req.method !== 'GET') return;

  // Live API data: network-only, no caching, so shops/products/orders stay fresh.
  if (url.hostname === API_HOST) {
    event.respondWith(fetch(req));
    return;
  }

  // Page navigations: try network first (fresh content), fall back to cache,
  // and finally to offline.html if neither works.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // Everything else (CSS/JS/images): cache-first, then network, updating the cache as we go.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
