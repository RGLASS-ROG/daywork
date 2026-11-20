// Daywork Service Worker: App offline verfügbar machen, Klick auf Benachrichtigung.
const VERSION = 'daywork-v5';
const SHELL = ['./', 'index.html', 'privacy.html', 'styles.css', 'i18n.js', 'config.js', 'store.js', 'cloud.js', 'app.js',
  'vendor/msal-browser.min.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Eigene Dateien: erst Netz (damit Updates sofort ankommen), sonst Cache.
// Fremde Server (Microsoft) laufen unverändert durch.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { c.postMessage({ type: 'open-task', id }); return c.focus(); }
    return self.clients.openWindow('./?task=' + encodeURIComponent(id || ''));
  }));
});
