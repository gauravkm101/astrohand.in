// AstroHand Service Worker
// Strategy: NETWORK-FIRST for everything on our own domain.
// Why: the site is updated often — users must always get the newest version.
// The cache is only a fallback so the app still opens when offline.
// Cross-origin requests (Supabase, Groq backend, fonts CDN) are untouched.

const CACHE = 'astrohand-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['/']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // never touch API/CDN calls

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Save a fresh copy for offline use
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        // Offline: serve from cache, else fall back to the app shell
        caches.match(e.request).then((m) => m || caches.match('/'))
      )
  );
});
