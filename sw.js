const CACHE_NAME = 'ccaf-exam-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

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

// Fetch: network-first for API calls, cache-first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle http/https requests (skip chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Don't cache Supabase API calls or analytics
  if (url.hostname.includes('supabase') || url.hostname.includes('vercel') || url.hostname.includes('jsdelivr')) {
    return; // let the browser handle these normally
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        // Update cache with fresh response
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // Offline fallback to cache

      return cached || networkFetch;
    })
  );
});
