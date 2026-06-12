# Runbook — Reemplazar polling con Reverb (WebSockets tiempo real)

> Hoy el frontend hace polling cada 30s a `/notificaciones`. Latencia para owner de hasta 30s. Para tiempo real (< 1s) cuando crezca el volumen.

## Estado actual (qué reemplaza)

`apps/web/src/store/notificaciones.ts:74` corre `setInterval(() => get().refresh(), 30_000)`.

Para 10 owners online → 1200 requests/h innecesarios cuando no hay novedades. Multiplicado por crecimiento, esto duele.

## ⚠️ Antes de migrar — verificar si es necesario

Reverb agrega complejidad operativa significativa (servidor WebSocket aparte, ports abiertos, certificados WSS). **No migres si:**

- Owners reportan que 30s es aceptable.
- Estás por debajo de 50 owners simultáneos.
- Te basta con notificaciones push del SO (PWA — pendiente Fase 6 del roadmap original).

**Sí migra si:**

- Latencia > 30s es queja recurrente.
- Quieres añadir chat con el cliente (bidireccional).
- Tienes > 100 owners online — polling se vuelve costoso.

## ⚠️ Hostinger Business Shared NO soporta Reverb

Reverb necesita correr como **proceso de servidor persistente** (long-running daemon). Hostinger Business Shared:

- ❌ No permite procesos daemon persistentes.
- ❌ El puerto WebSocket no se puede exponer.
- ❌ `supervisor` no está disponible.

**Conclusión: migrar a Reverb requiere también migrar a VPS o Cloud Hostinger.**

## Alternativa intermedia: Pusher (managed)

Si no quieres migrar de Hostinger Shared, Pusher es la salida:

- Pusher hostea el WebSocket server.
- La API Laravel sólo manda eventos vía HTTP a Pusher.
- Frontend conecta directo a Pusher.
- Sin daemon en Hostinger.

**Costo**: tier gratis hasta 200k mensajes/día. Más que suficiente para empezar.

Si quieres mantener todo self-hosted, Reverb es el camino — pero requiere VPS.

## Opción A — Pusher (sin cambio de hosting)

### 1. Cuenta Pusher

https://pusher.com → Sign up → Create new app:
- Name: `clicktoeat`
- Cluster: `us2` (más cerca de México)

Te da credenciales:
- `app_id`
- `key`
- `secret`
- `cluster`

### 2. Instalar el SDK

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
composer require pusher/pusher-php-server
```

### 3. `.env` productivo

```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=<app_id>
PUSHER_APP_KEY=<key>
PUSHER_APP_SECRET=<secret>
PUSHER_APP_CLUSTER=us2
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
```

Frontend (`apps/web/.env.production`):

```env
NEXT_PUBLIC_PUSHER_KEY=<key>
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

### 4. Crear evento broadcast

```bash
php artisan make:event PedidoCreado
```

```php
<?php

namespace App\Events;

use App\Models\Pedido;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PedidoCreado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Pedido $pedido) {}

    public function broadcastOn(): array
    {
        // Canal privado del local — sólo usuarios del local pueden suscribirse
        return [new PrivateChannel("local.{$this->pedido->local_id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'pedido_id' => $this->pedido->id,
            'codigo'    => $this->pedido->codigo,
            'cliente'   => $this->pedido->cliente_nombre,
            'total'     => (float) $this->pedido->total,
            'created_at' => $this->pedido->created_at->toIso8601String(),
        ];
    }
}
```

### 5. Disparar el evento

En `OrderService::crear`, después del COMMIT:

```php
// Después de cerrar la transacción
event(new \App\Events\PedidoCreado($pedido));
```

### 6. Auth de canal privado

`routes/channels.php`:

```php
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('local.{localId}', function (User $user, int $localId) {
    return $user->local_id === $localId || $user->isSuperAdmin();
});
```

Necesita configurar `routes/channels.php` se carga via bootstrap/app.php → `withRouting(channels: ...)`.

### 7. Frontend — suscribirse

```bash
cd apps/web
npm install pusher-js laravel-echo
```

`apps/web/src/lib/echo.ts`:

```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

(window as any).Pusher = Pusher;

export const echo = new Echo({
  broadcaster: 'pusher',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  forceTLS: true,
  authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: `Bearer ${tokenStore.get()}`,
    },
  },
});
```

`apps/web/src/store/notificaciones.ts`:

```ts
import { echo } from '@/lib/echo';
import { useAuth } from './auth';

// Reemplazar startPolling con startRealtime:
startRealtime() {
  const user = useAuth.getState().user;
  if (!user?.local_id) return;

  // Carga inicial
  get().refresh();

  // Suscripción
  echo.private(`local.${user.local_id}`)
    .listen('PedidoCreado', (data: { pedido_id: number, codigo: string, ... }) => {
      // Refresh para traer el pedido completo + actualizar lista
      get().refresh();

      // Tocar notif sonora / browser notification opcional
    });
},

stopRealtime() {
  const user = useAuth.getState().user;
  if (user?.local_id) {
    echo.leave(`local.${user.local_id}`);
  }
}
```

### 8. Mantener polling como fallback

Durante el rollout, **NO quitar el polling**. Subir a 5 min en lugar de 30s:

```ts
const handle = setInterval(() => get().refresh(), 300_000);  // 5 min
```

Asegura que aunque Pusher caiga, las notificaciones llegan eventualmente.

Después de 1-2 semanas estable, evaluar bajar el polling a 15 min como "garantía" o quitarlo.

### 9. Test

1. Abrir el panel admin como owner en 2 navegadores.
2. Desde un tercer navegador (incógnito), crear pedido en `https://clicktoeat.lumiaaisolutions.com/tacos-el-gordo`.
3. Ambos paneles deben mostrar el nuevo pedido en < 1s.

## Opción B — Reverb (self-hosted, requiere VPS)

### Pre-requisito

Migrar de Hostinger Business Shared a Hostinger **VPS** o **Cloud**. Esto es proyecto aparte — escribir runbook de migración primero.

### 1. Instalar

```bash
composer require laravel/reverb
php artisan reverb:install
```

Configura `.env` automático con `BROADCAST_CONNECTION=reverb`.

### 2. Correr el daemon

```bash
php artisan reverb:start --host=0.0.0.0 --port=8080
```

En VPS, esto debe correr bajo `supervisor` o `systemd`:

```ini
# /etc/supervisor/conf.d/clicktoeat-reverb.conf
[program:clicktoeat-reverb]
command=php /var/www/clicktoeat/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=deployer
redirect_stderr=true
stdout_logfile=/var/log/clicktoeat-reverb.log
```

### 3. Proxy WSS

nginx (en el VPS):

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```

### 4. Frontend igual que con Pusher

Reverb expone API compatible con Pusher. Misma config `laravel-echo` pero con `wsHost` apuntando al VPS.

## Comparación final

| Aspecto | Polling actual | Pusher | Reverb (VPS) |
|---------|---------------|--------|--------------|
| Latencia | 0-30s | < 1s | < 1s |
| Setup en backend | ✅ Hecho | 30 min | 4-8h + VPS migration |
| Setup en frontend | ✅ Hecho | 30 min | 30 min |
| Hosting compatible | Hostinger Shared | Hostinger Shared | Requiere VPS |
| Costo | $0 | $0 hasta 200k msgs/día, después ~$50/mes | VPS ~$15-30/mes |
| Vendor lock-in | Ninguno | Pusher.com | Ninguno |
| Operación | Trivial | Trivial | Hay que monitor el daemon |

**Recomendación**: empezar con **Pusher** cuando llegue la necesidad. Migrar a Reverb si Pusher se vuelve caro O si ya estás en VPS por otras razones.

## Updates a documentación cuando se complete

- [ ] Marcar **ADR-007** (polling) como `superseded by ADR-XXX` y crear nuevo ADR.
- [ ] Actualizar `docs/features/notificaciones.md`.
- [ ] Actualizar `docs/architecture/stack.md`.
- [ ] Quitar pendiente de `docs/issues/funcionalidad-faltante.md`.
