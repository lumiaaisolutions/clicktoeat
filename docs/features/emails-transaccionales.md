# Emails transaccionales

ClickToEat envía 4 tipos de email automáticamente. Todos usan el `MAIL_MAILER` configurado en `.env` (hoy Hostinger SMTP).

## 1. Pedido confirmado al cliente final (F62)

**Cuando**: al crear un pedido y el cliente dejó email (campo opcional en checkout).
**A**: cliente final.
**Asunto**: "Recibimos tu pedido CE-ABC123 · {nombre del local}"
**Trigger**: inline en `OrderService::crear` después del commit.
**Plantilla**: `resources/views/mail/pedido_confirmado.blade.php`

Incluye: hero con color/logo del local, lista de productos con precios, subtotal/envío/total, dirección, método de pago, contacto WhatsApp del local.

## 2. Onboarding del trial (F64) — TrialNudgeMail

**Cuando**: scheduler diario a las 10:00.
**A**: owner del local.
**Variantes**: `trial_d3`, `trial_d7`, `trial_d14`, `trial_ending` (un día antes de expirar).
**Trigger**: `TrialNudgeDispatcher::dispatchPending()`.
**Idempotencia**: tabla `local_email_log` con unique `(local_id, tipo)`.
**Plantilla**: `resources/views/mail/trial_nudge.blade.php`

Sólo se envía a locales con `plan_status='trialing'` y `pago_externo=false`.

## 3. Carrito abandonado (F75) — CarritoAbandonadoMail

**Cuando**: scheduler cada 15min.
**A**: cliente final que dejó email pero no envió pedido.
**Asunto**: "🛒 Te quedó algo pendiente en {nombre del local}"
**Trigger**: `CarritoAbandonadoDispatcher::dispatchPending()`.
**Plantilla**: `resources/views/mail/carrito_abandonado.blade.php`

Ver [`carrito-abandonado.md`](./carrito-abandonado.md).

## 4. Resumen semanal al owner (F74) — ResumenSemanalMail

**Cuando**: scheduler los domingos a las 20:00.
**A**: owner del local.
**Asunto**: "📊 Tu semana en {nombre del local}"
**Trigger**: `ResumenSemanalDispatcher::dispatchAll()`.
**Plantilla**: `resources/views/mail/resumen_semanal.blade.php`

Incluye: pedidos de la semana, ventas totales, ticket promedio, comparativa vs semana anterior, top 3 productos.

Sólo se envía si:
- El local tiene plan activo o `pago_externo=true`.
- Hubo al menos 1 pedido en la semana actual o anterior (no spam a locales muertos).

## Configuración

```bash
# apps/api/.env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
MAIL_USERNAME=fernando@lumiaaisolutions.com
MAIL_PASSWORD=<secret>
MAIL_FROM_ADDRESS=fernando@lumiaaisolutions.com
MAIL_FROM_NAME="ClickToEat"
```

Probar:
```bash
php artisan tinker --execute="Mail::raw('test', fn(\$m)=>\$m->to('tu@correo')->subject('test ClickToEat'));"
```

## Scheduler

Asegúrate de tener este cron en hPanel:
```cron
* * * * * cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

Si está, Laravel decide internamente cuándo correr cada job.

## Failure modes

Cada `try { Mail::send } catch (Throwable $e) { report($e); }` — un fallo en email JAMÁS rompe la creación del pedido ni el flujo principal. Los errores van a Sentry/laravel.log.
