# PushDispatcher — fan-out de notificaciones push

> Patrón unificado para mandar notificaciones push tanto al **navegador**
> (PWA via Web Push + VAPID) como a la **app móvil nativa** (Expo Push
> Service + APNs/FCM) desde una sola llamada.
> Introducido junto con la app móvil iOS/Android — 2026-06-19.

## Por qué

El sistema tiene dos canales de push:

| Canal | Cuándo aplica | Lib backend |
|---|---|---|
| **Web Push** | Owner tiene PWA abierta en Chrome/Safari | `minishlink/web-push` + VAPID |
| **Expo Push** | Owner tiene la app móvil instalada | HTTP a `exp.host/--/api/v2/push/send` |

Ambos pueden coexistir para el mismo owner (PWA en escritorio + móvil en
bolsillo). El `PushDispatcher` evita que cada caller (OrderService,
TicketsController, etc.) tenga que llamar dos servicios distintos.

## Cómo usar

```php
use App\Services\Notifications\PushDispatcher;

app(PushDispatcher::class)->sendToLocal($local->id, [
    'title' => 'Pedido nuevo '.$pedido->codigo,
    'body'  => $pedido->cliente_nombre.' · $'.number_format($pedido->total, 2),
    'url'   => '/admin/pedidos',                          // ← para web (PWA)
    'tag'   => 'pedido-'.$pedido->id,                     // ← agrupación web
    'data'  => [                                          // ← para móvil
        'pedido_id' => $pedido->id,
        'codigo'    => $pedido->codigo,
        'route'     => '/(admin)/pedidos/'.$pedido->id,   // deep-link app
    ],
]);
```

`PushDispatcher::sendToLocal($localId, $payload)` internamente llama:
- `WebPushSender::sendToLocal()` → recorre `push_subscriptions` del local
- `ExpoPushSender::sendToLocal()` → recorre `mobile_devices` del local

Si alguno de los canales no tiene tokens registrados o no está configurado
(VAPID env vars faltan, no hay devices móviles), **no-op silencioso** — la
operación de negocio sigue sin error.

## API

```php
class PushDispatcher
{
    public function sendToLocal(int $localId, array $payload): void;
    public function sendToUser(int $userId, array $payload): void;
    public function sendToSuperAdmins(array $payload): void;
}
```

`sendToSuperAdmins` solo emite por Web Push hoy — los super_admin no se
enrolan al canal móvil (no es su flujo).

## Convención de `$payload`

El payload acepta llaves redundantes para servir a ambos canales:

| Llave | Canal web | Canal móvil |
|---|---|---|
| `title` | ✓ Notification title | ✓ Notification title |
| `body`  | ✓ Notification body  | ✓ Notification body |
| `url`   | ✓ URL a navegar al click | — |
| `tag`   | ✓ Browser notification group | — |
| `data`  | — | ✓ Object pasado a la app |
| `data.route` | — | ✓ **Deep-link** — la app navega a esta ruta |

La app móvil lee `data.route` en `usePushDeepLink` y hace `router.push(route)`.

## Callers actuales

Quien dispara push **ya migrado al PushDispatcher**:
- `App\Services\Orders\OrderService::crear` — pedido nuevo

Quien sigue llamando `WebPushSender` directo (TODO migrar):
- `App\Http\Controllers\Api\Admin\TicketsController::storeForOwner` (super_admin)
- `App\Http\Controllers\Api\Admin\TicketsController::responder`

Pendiente: cuando agreguemos respuesta de tickets desde super_admin al
móvil del owner, migrar a `PushDispatcher::sendToUser`.

## Manejo de tokens muertos

### Web Push
`WebPushSender::sendToSubs` itera el resultado de `$webPush->flush()`. Si
el endpoint responde 404 o 410 (browser revocó), borra la fila de
`push_subscriptions`.

### Expo Push
`ExpoPushSender::handleResponse` lee el ticket de Expo. Si `status: 'error'`
con `details.error === 'DeviceNotRegistered'` o `'InvalidCredentials'`,
borra la fila de `mobile_devices`.

## Tests

No hay test directo del `PushDispatcher` (es solo glue). Los servicios
individuales tienen:
- `MobileDeviceRegistrationTest` — registro de tokens móviles
- (Sin test específico para `ExpoPushSender::send` porque hace HTTP real
  a Expo — se podría hacer con `Http::fake()` si se vuelve crítico)

## Archivos

| Archivo | Rol |
|---|---|
| `app/Services/Notifications/PushDispatcher.php` | Fan-out unificado |
| `app/Services/Notifications/WebPushSender.php` | Browser (PWA) |
| `app/Services/Notifications/ExpoPushSender.php` | App móvil |
| `app/Models/PushSubscription.php` | Modelo web |
| `app/Models/MobileDevice.php` | Modelo móvil |
