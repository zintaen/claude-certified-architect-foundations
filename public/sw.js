// Kill-switch service worker.
//
// The previous (V1, Vite + Workbox) build registered a PWA service worker at /sw.js. It keeps
// intercepting navigations on this origin for returning visitors and serving stale, precached
// responses - including 404s for routes that only exist in the current app (e.g. /leaderboard,
// /dashboard). The current Next.js app ships no service worker of its own.
//
// This file replaces the old worker at the same path. When an existing client performs its periodic
// service-worker update check and re-fetches /sw.js, it installs this version, which deletes every
// cache, unregisters itself, and reloads any open pages so the user lands on the live site. Browsers
// with no service worker (new visitors, or anyone already cleared) are unaffected: the app never
// calls navigator.serviceWorker.register, so this script is only ever activated as a replacement for
// the stale worker. Once all returning clients have healed, this file can be removed.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
