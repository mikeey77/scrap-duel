// Scrap Duel service worker: makes the game installable and playable offline (solo, sandbox).
// The page itself is fetched network-first so updates (and the multiplayer protocol) arrive right away;
// icons, fonts and the networking library are served from cache and refreshed in the background.
const CACHE = 'scrap-duel-v1';
const CORE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request,
    url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname === '/index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }
  const cacheable =
    url.origin === location.origin ||
    /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) ||
    /(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
