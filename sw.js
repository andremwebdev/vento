// Offline cache for Campione. Stale-while-revalidate on the app shell:
// opens instantly from cache, fetches updates in the background.
const CACHE = 'vento-1.0.0-mvrdafjb';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const network = fetch(req)
    .then(async (res) => {
      if (res && res.ok) {
        const c = await caches.open(CACHE);
        await c.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
      }
      return res;
    })
    .catch(() => null);
  e.waitUntil(network.then(() => undefined));

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = (await c.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? (await c.match('./index.html')) || (await c.match('./')) : null);
    if (cached) return cached;
    const res = await network;
    return res || new Response('Campione è offline e questa risorsa non è in cache.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
