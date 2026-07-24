/* SCALE-002 service worker — hand-rolled strategy map (see src/sw.ts). */
/* eslint-disable no-restricted-globals */
const VERSION = 'ccaf-pwa-v1';
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_SHELLS = `${VERSION}-shells`;

const NEVER_PREFIXES = [
  '/api/exam/grade',
  '/api/entitlements',
  '/api/tutor',
  '/api/webhooks',
  '/api/offline/sync',
  '/checkout',
  '/api/paddle',
];

function strategyFor(pathname) {
  for (const p of NEVER_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + '/')) return 'bypass';
  }
  if (pathname.startsWith('/api/')) return 'network-first';
  if (
    pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(pathname)
  ) {
    return 'cache-first';
  }
  if (pathname === '/' || !pathname.includes('.')) return 'stale-while-revalidate';
  return 'network-first';
}

self.addEventListener('install', (event) => {
  // Idle-deferred precache: do not block install with a large precache list.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('ccaf-pwa-') && !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'PURGE_AND_UNREGISTER') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
      })()
    );
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_SHELLS);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || network;
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_SHELLS);
    const hit = await cache.match(request);
    if (hit) return hit;
    throw new Error('offline');
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const strategy = strategyFor(url.pathname);
  if (strategy === 'bypass') return; // network only, never touch Cache Storage

  if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (strategy === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (strategy === 'network-first') {
    event.respondWith(networkFirst(req));
  }
});
