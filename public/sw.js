self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch (e) {}
  const title = data.title || 'Local Effort';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification?.data?.url || '/';
  event.notification.close();
  event.waitUntil(clients.openWindow(url));
});
