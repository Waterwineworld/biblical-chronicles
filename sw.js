// Biblical Chronicles — Service Worker
// Caches the game for offline play after first visit

const CACHE_NAME = 'biblical-chronicles-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@400;600;700;900&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js',
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets immediately, external ones best-effort
      const local = ['/'];
      const external = ASSETS.filter(u => u.startsWith('http'));
      return Promise.allSettled([
        cache.addAll(local),
        ...external.map(url => cache.add(url).catch(() => {}))
      ]);
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET and browser-extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  // Skip Firestore live requests — always need network
  if (event.request.url.includes('firestore.googleapis.com')) return;
  if (event.request.url.includes('firebase.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses for static assets
        if (response && response.status === 200 && response.type !== 'opaque') {
          const url = event.request.url;
          const cacheable = url.includes('fonts.googleapis') ||
                            url.includes('fonts.gstatic') ||
                            url.includes('gstatic.com/firebasejs') ||
                            url.endsWith('.html') ||
                            url.endsWith('.js') ||
                            url.endsWith('.css') ||
                            url.endsWith('.png') ||
                            url.endsWith('.ico');
          if (cacheable) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML requests
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
