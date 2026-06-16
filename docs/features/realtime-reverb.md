# Feature — Real-time con Laravel Reverb (skeleton)

> **Estado**: skeleton + docs. NO instalado en producción todavía.
> Reemplazará al polling de 30s del `NotificacionesBell` por WebSocket.

## Por qué Reverb (no Pusher hosted)

| | Reverb (OSS, self-host) | Pusher hosted |
|--|--|--|
| Costo | Gratis | $49+/mes |
| Latencia | Local | OK |
| Setup en CageFS Hostinger | Requiere worker queue | Sólo .env |
| Control | Total | Limitado |

Reverb encaja porque ya corremos Laravel y podemos exponer un puerto en
el VPS. La caveat es que Hostinger CageFS no permite `supervisord`
estándar — hay que correr `php artisan reverb:start` desde un Cron
`@reboot` o usar systemd-user-units (no disponible en CageFS).

## Pasos para activarlo

```bash
cd apps/api
composer require laravel/reverb:^1
php artisan reverb:install
```

Eso agrega al `.env`:
```
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
REVERB_HOST=clicktoeat-api.lumiaaisolutions.com
REVERB_PORT=443
REVERB_SCHEME=https
```

## Evento + canal

```php
// app/Events/PedidoCreado.php
class PedidoCreado implements ShouldBroadcastNow {
    public function __construct(public Pedido $pedido) {}
    public function broadcastOn(): array {
        return [new PrivateChannel("local.{$this->pedido->local_id}")];
    }
    public function broadcastWith(): array {
        return ['codigo' => $this->pedido->codigo, 'cliente' => $this->pedido->cliente_nombre, 'total' => (float) $this->pedido->total];
    }
}
```

Disparar desde `OrderService::crear` con `event(new PedidoCreado($pedido))`.

## Frontend

```bash
cd apps/web
npm install --save laravel-echo pusher-js
```

```ts
// apps/web/src/lib/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global { interface Window { Pusher?: any; Echo?: any } }
window.Pusher = Pusher;

export const echo = new Echo({
  broadcaster: 'reverb',
  key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
  wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
  auth: { headers: { Authorization: `Bearer ${tokenStore.get()}` } },
});
```

```ts
// NotificacionesBell.tsx — reemplazar setInterval por:
useEffect(() => {
  if (!user) return;
  echo.private(`local.${user.local_id}`)
    .listen('PedidoCreado', (e: any) => {
      // toast + sound + refresh count
    });
  return () => { echo.leaveChannel(`local.${user.local_id}`); };
}, [user]);
```

## Producción en Hostinger CageFS

CageFS no soporta `supervisor`. Alternativas:

1. **Cron @reboot** que arranca `php artisan reverb:start` en background.
2. **Forge / Ploi** managed (costo extra) — el más confiable.
3. **Servidor separado** (DigitalOcean droplet $4/mes) sólo para Reverb.
4. **Hostinger VPS dedicado** plan superior con sudo.

Mi recomendación: arrancar con droplet barato. Reverb es ligero (~50MB RAM).

## Por qué NO instalé hoy

- Requiere infra fuera del scope local (websocket server corriendo)
- El polling de 30s funciona bien para volumen actual (<50 pedidos/local/día)
- Migración del bell es ~30 líneas, fácil de aplicar después
- Setup en Hostinger CageFS no es trivial

Cuando llegue el primer cliente con >100 pedidos/día, vale la pena
agregar Reverb.

## Ver también
- [Laravel Reverb docs](https://reverb.laravel.com)
- [`features/notificaciones.md`](notificaciones.md) — patrón actual de polling
