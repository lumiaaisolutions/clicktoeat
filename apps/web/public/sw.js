/* ClickToEat service worker — v1
 *
 * Responsable de:
 *  1. PWA installable: skipWaiting + claim al activarse, sin caché agresiva
 *     porque el panel es una SPA que cambia seguido.
 *  2. Web Push: maneja `push` con payload JSON { title, body, url, tag } y
 *     `notificationclick` para abrir/enfocar la URL destino.
 *
 * Mantenerlo simple — no cachear nada por ahora. Si en el futuro hacemos
 * offline support, agregar cache strategies acá.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* ─────────── Web Push ─────────── */

self.addEventListener('push', (event) => {
  let payload = { title: 'ClickToEat', body: 'Nuevo evento', url: '/admin', tag: 'ce' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (_) {
    // payload no-JSON → mantiene defaults
  }

  const promise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag:  payload.tag,
    data: { url: payload.url ?? '/admin/pedidos' },
    requireInteraction: false,
    vibrate: [120, 60, 120],
  });

  event.waitUntil(promise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin/pedidos';

  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Si ya hay una ventana abierta del mismo origen, navega y enfoca.
    for (const c of clientsArr) {
      try {
        const u = new URL(c.url);
        if (u.origin === self.location.origin) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      } catch (_) { /* ignore */ }
    }
    return self.clients.openWindow(url);
  })());
});
