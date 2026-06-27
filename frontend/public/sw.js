const CACHE = 'ipfundo-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', (e: any) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e: any) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('activate', (e: any) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});

// Push notification
self.addEventListener('push', (e: any) => {
  const data = e.data?.json() || { title: 'ipfundo', body: 'New notification' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon.svg', badge: '/icon.svg',
    vibrate: [200, 100, 200], data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e: any) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
