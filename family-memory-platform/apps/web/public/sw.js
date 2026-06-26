/* BLOCK 4 PWA service worker — cache shell + offline badge signal */
const CACHE = 'family-memory-v1';
const SHELL = ['/', '/manifest.webmanifest', '/tree'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.pathname.startsWith('/_next/static')) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/'))),
  );
});

/** Push hooks stub (#04) */
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? { title: 'Family Memory', body: 'New activity' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Family Memory', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
