const CACHE = 'ipfundo-v1';
const ASSETS = ['/', '/index.html'];

// In development (Vite HMR active), this SW must not intercept anything.
// Self-unregister so Vite can do its job.
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
if (IS_DEV) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => self.registration.unregister());
  // Don't define any fetch handler — let all requests pass through
}

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }));
});

self.addEventListener('fetch', function(e) {
  // Don't cache API calls — pass through to network
  if (e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then(function(r) { return r || fetch(e.request); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
});

self.addEventListener('push', function(e) {
  var data = (e.data && e.data.json()) || { title: 'ipfundo', body: 'New notification' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon.svg', badge: '/icon.svg',
    vibrate: [200, 100, 200], data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
