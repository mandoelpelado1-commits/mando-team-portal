// Minimal service worker: exists only to receive Web Push notifications and
// route taps back into the app. No caching/offline behavior — that's a
// separate concern from push and adding it here risks serving stale pages.

self.addEventListener('push', (event) => {
  let data = { title: 'Mando El Pelado', body: '' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/mando-el-pelado-logo.png',
      badge: '/mando-el-pelado-logo.png',
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
