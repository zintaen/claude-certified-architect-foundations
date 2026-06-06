const CACHE_NAME = 'ccaf-exam-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/cyberskill-logo.svg'
];

// Domains to never cache (API calls, CDN, analytics)
const EXCLUDED_HOSTS = new Set([
  'idtmcfqcgvecrivvtsxv.supabase.co',
  'va.vercel-scripts.com',
  'cdn.jsdelivr.net'
]);

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate for app shell, network-only for excluded hosts
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle http/https (skip chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Don't cache API calls, analytics, or CDN
  if (EXCLUDED_HOSTS.has(url.hostname)) return;

  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request.clone()).then(response => {
        // Only cache successful same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // Offline fallback to cache

      return cached || networkFetch;
    })
  );
});
