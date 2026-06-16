# PWA + Web Push

El panel del local funciona como PWA instalable (Chrome/Edge/Safari) y recibe notificaciones push reales del navegador cuando llega un pedido nuevo, incluso si la pestaña no está activa.

## PWA

- **`public/manifest.webmanifest`** — `display: standalone`, theme color `#0B0B0F`, shortcuts a `/admin/pedidos` y `/admin/punto-venta`.
- **`public/sw.js`** — service worker minimal: `skipWaiting + claim`, handler `push`, handler `notificationclick` que enfoca/abre `/admin/pedidos`.
- **`<PwaRegister>`** — registra el SW al cargar la app (sólo en contexto seguro: HTTPS o localhost).
- **`<InstallPrompt>`** — banner discreto en `/admin/*` cuando el browser dispara `beforeinstallprompt`. Snooze 14 días si lo cierran.

## Web Push (VAPID)

Backend usa `minishlink/web-push`. Las suscripciones se guardan en `push_subscriptions` (unique por endpoint).

### Setup en .env

```bash
VAPID_SUBJECT="mailto:soporte@lumiaaisolutions.com"
VAPID_PUBLIC_KEY=BHu...
VAPID_PRIVATE_KEY=bMY...
```

Generar par nuevo:
```bash
cd apps/api && php -r "require 'vendor/autoload.php'; print_r(\Minishlink\WebPush\VAPID::createVapidKeys());"
```

Frontend lee `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (la pública, no el privado).

### Flujo

1. Usuario entra al panel → polling `LivePedidosPoller` levanta `Notification.requestPermission()` después de 4s.
2. Si acepta → `<PushSubscriber>` llama `reg.pushManager.subscribe({applicationServerKey: PUBLIC_KEY})`.
3. Envía endpoint + p256dh + auth a `POST /push/subscribe` (auth Bearer).
4. Backend guarda en `push_subscriptions` (upsert por endpoint).
5. Cuando se crea un pedido, `OrderService::crear` llama `WebPushSender::sendToLocal($localId, payload)`.
6. El sender envía el JSON firmado a Apple/Google/Mozilla push servers.
7. El SW del browser recibe el push aunque la pestaña esté cerrada → muestra notificación nativa.

### Endpoints

| Verbo | Path | Notas |
|---|---|---|
| GET  | `/push/vapid-public-key` | Devuelve la clave pública para el front |
| POST | `/push/subscribe` | Registra/actualiza la sub. Throttle 20/min |
| POST | `/push/unsubscribe` | Borra la sub. Throttle 20/min |

### Limpiar suscripciones muertas

Cuando el browser deja de aceptar el push (user desinstaló PWA, revocó permisos, etc.) responde 404 o 410. `WebPushSender::sendToLocal` borra automáticamente esas subs.

### Diferencia con polling

- **Polling (`LivePedidosPoller`)**: cada 15s mientras la pestaña esté visible. Sin push. Suena beep + toast + Notification API. Funciona siempre.
- **Web Push (real)**: aunque la pestaña esté cerrada o el browser cerrado (con PWA instalada). Requiere VAPID setup + permiso.

Ambos coexisten. Si la pestaña está abierta, recibes los dos — el `tag` deduplica.
