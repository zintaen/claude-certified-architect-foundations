if (!self.define) {
  let e,
    s = {};
  const n = (n, i) => (
    (n = new URL(n + '.js', i).href),
    s[n] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (i, r) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[t]) return;
    let o = {};
    const l = (e) => n(e, t),
      u = { module: { uri: t }, exports: o, require: l };
    s[t] = Promise.all(i.map((e) => u[e] || l(e))).then((e) => (r(...e), o));
  };
}
define(['./workbox-1922e0e9'], function (e) {
  'use strict';
  (self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: 'registerSW.js', revision: '1872c500de691dce40960bb85481de07' },
        { url: 'manifest.json', revision: '25173dcaafb6bc10c150b28d1c68eadb' },
        { url: 'index.html', revision: '0c818fc643d8e56c1bca87fba1576a45' },
        { url: 'cyberskill-logo.svg', revision: 'ddc6ab3c75741a3c0476fc5244a8892b' },
        { url: 'assets/vendor-BGFnJ2b-.js', revision: null },
        { url: 'assets/rolldown-runtime-1VNLd2iN.js', revision: null },
        { url: 'assets/main-DitiFYDH.js', revision: null },
        { url: 'assets/main-C3P4P1HU.css', revision: null },
        { url: 'assets/decryption.worker-CMhuGTys.js', revision: null },
        { url: 'assets/db.worker-DHzhWjNB.js', revision: null },
        { url: 'assets/admin-DipZGy7A.js', revision: null },
      ],
      {}
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL('index.html'))),
    e.registerRoute(
      /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
      new e.CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536e3 }),
          new e.CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/.*\.supabase\.co\/rest\/v1\/rpc\/submit_exam_result/,
      new e.NetworkOnly({
        plugins: [new e.BackgroundSyncPlugin('exam-sync-queue', { maxRetentionTime: 1440 })],
      }),
      'GET'
    ));
});
