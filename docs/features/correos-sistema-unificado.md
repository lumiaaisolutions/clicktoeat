# Feature — Sistema de correos unificado + seguimiento de pedido

> Cómo lucen y de dónde salen TODOS los correos de ClickToEat tras la
> homologación visual. El detalle de cada correo transaccional individual
> (trial, carrito, resumen semanal) vive en
> [`emails-transaccionales.md`](./emails-transaccionales.md) y
> [`carrito-abandonado.md`](./carrito-abandonado.md); este doc cubre el
> **layout compartido** y el **seguimiento de pedido al cliente**.

## Layout base compartido

`apps/api/resources/views/mail/layout.blade.php` es el layout del que
**extienden todas** las plantillas (`resources/views/mail/*` y
`resources/views/emails/*`) vía `@extends('mail.layout')` + `@section('content')`.

Diseño:

- **Splash header suave** con gradiente durazno → crema
  (`linear-gradient(180deg, #F9CDA8 0% → #FBE4D2 44% → #FDF7F1 100%)`).
- **Logo ClickToEat**: PNG (`https://clicktoeat.lumiaaisolutions.com/email-logo.png`,
  servido por el frontend) + wordmark `Click`·`To`(naranja `#F26A1F`)·`Eat`.
- **Tarjeta blanca** para el cuerpo (`@yield('content')`).
- **Footer** con contacto `contacto@lumiaaisolutions.com` + tagline de marca.

Secciones opcionales que una plantilla puede definir:

- `@section('title')` → `<title>` (default `ClickToEat`).
- `@section('kicker')` → etiqueta en mayúsculas bajo el logo.

El layout fuerza `color-scheme: light only` (los correos no siguen dark mode).

## "Restablecer contraseña" — ya no usa el MailMessage default

`app/Notifications/ResetPasswordNotification.php` dejó de construir un
`MailMessage` genérico de Laravel: ahora renderiza la vista
`mail.reset_password` (que extiende el layout), con la URL del frontend
(`FRONTEND_URL/reset-password?token=...&email=...`) para que el flujo termine
en la landing pública, no en el backend.

## Seguimiento de pedido al cliente (`PedidoEstadoMail`)

`app/Mail/PedidoEstadoMail.php` manda un correo al cliente en cada cambio de
estado relevante, con copy **consciente del modo de entrega**
(recoger vs. a domicilio, según `metodo_entrega === 'delivery'`).

Estados que disparan correo — constante `PedidoEstadoMail::NOTIFICABLES`:

```php
['confirmado', 'listo', 'en_camino', 'entregado']
```

Copy por estado (método `copy()`):

| Estado | A domicilio | Para recoger |
|--------|-------------|--------------|
| `confirmado` | "¡Confirmamos tu pedido!" | (mismo) |
| `listo` | "Tu pedido está listo" (sale en camino) | "¡Tu pedido está listo para recoger!" |
| `en_camino` | "Tu pedido va en camino" | — |
| `entregado` | "¡Que lo disfrutes!" | (mismo) |

El `replyTo` es el `email_contacto` del local si existe. Vista:
`mail.pedido_estado`.

### Dónde se dispara

`PedidoController::updateEstado` envía el correo **solo si se cumplen todas**
estas condiciones:

1. El estado realmente cambió (`$nuevoEstado !== $estadoAnterior`).
2. `origen === 'landing'` (los pedidos de POS/mostrador no notifican —
   normalmente no tienen correo del cliente). Ver
   [`schema.md`](../database/schema.md) → `pedidos.origen`.
3. El pedido tiene `cliente_email`.
4. El nuevo estado está en `NOTIFICABLES`.

El envío es **best-effort**: va envuelto en `try/catch` con `report($e)` — si
el SMTP falla, no rompe el cambio de estado.

## `pedido_confirmado` ahora es un comprobante

`PedidoConfirmadoMail` (vista `mail.pedido_confirmado`) dejó de ser un aviso
escueto: hoy es un comprobante con el detalle de items
(`$pedido->detalles`: cantidad × `producto_nombre`), método de pago y datos del
negocio. Usa el sistema de plantillas editables (`UsesEditableTemplate`).

## Correo del cliente ahora es obligatorio en el landing

Para que el seguimiento funcione, el correo del cliente pasó a ser
**requerido** al hacer un pedido desde la landing pública:

- Frontend: campo email obligatorio en el checkout.
- Backend: `App\Http\Requests\Pedido\StorePublicPedidoRequest` →
  `'cliente.email' => ['required', 'email:rfc', 'max:191']`.

## Inventario de correos

11 clases `App\Mail\*` + 1 notificación. Todos extienden el layout unificado.

| Correo | Clase / notificación | Cuándo | A quién |
|--------|----------------------|--------|---------|
| Bienvenida | `WelcomeMail` | Al crear el local/owner | Owner |
| Seguimiento de pedido | `PedidoEstadoMail` | Cambio de estado (`confirmado`/`listo`/`en_camino`/`entregado`) de pedido `origen=landing` | Cliente |
| Comprobante de pedido | `PedidoConfirmadoMail` | Al recibir un pedido | Cliente |
| Carrito abandonado | `CarritoAbandonadoMail` | Recuperación (cron) | Cliente |
| Resumen semanal | `ResumenSemanalMail` | Cron semanal | Owner |
| Nudge de trial | `TrialNudgeMail` | Días 3/7/14 y fin de prueba | Owner |
| Prueba por terminar | `TrialWillEndMail` | Trial próximo a expirar | Owner |
| Pago fallido | `PaymentFailedMail` | Webhook Stripe `payment_failed` | Owner |
| Plan cancelado | `PlanCanceledMail` | Webhook Stripe cancelación | Owner |
| Campaña | `CampanaMail` | Envío de campaña (contenido libre) | Clientes del local |
| Respuesta a ticket | `TicketReplyMail` | Respuesta de soporte | Autor del ticket |
| Restablecer contraseña | `ResetPasswordNotification` | `/forgot-password` | Usuario |

`CampanaMail` es contenido libre (marketing); el resto de transaccionales fijos
usan `UsesEditableTemplate` (el owner puede editar asunto/cuerpo — Fase 98).

## SMTP en producción

La configuración de envío en el VPS y su gotcha (alias vs. buzón primario) está
en [`../runbook/configurar-smtp-prod.md`](../runbook/configurar-smtp-prod.md).

## Envío en cola (async)

Todos los Mailables (`app/Mail/*`) y `ResetPasswordNotification` implementan
`ShouldQueue`, así que el correo **no bloquea** la petición que lo dispara
(crear pedido, cambiar estado, etc.).

- `QUEUE_CONNECTION=database` en prod (tabla `jobs`).
- **Sin worker persistente** en el VPS compartido: el mismo cron del scheduler
  drena la cola cada minuto —
  `bootstrap/app.php` → `queue:work --stop-when-empty --max-time=55 --tries=3
  --quiet` con `withoutOverlapping()->onOneServer()`. `--stop-when-empty` sale al
  vaciarla; `--max-time` la mantiene bajo el minuto.
- Los fallos van a `failed_jobs` (se purgan a 90 días, ver `queue:prune-failed`).
- En tests, `QUEUE_CONNECTION=sync` → se envían inline (no cambia el flujo).
