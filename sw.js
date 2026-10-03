/* Service worker: lets the site install as an app and reopen without a connection.
   Network first, so a fresh copy always wins; the cache is only a fallback. */
const CACHE = 'pvhk-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => { }); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
