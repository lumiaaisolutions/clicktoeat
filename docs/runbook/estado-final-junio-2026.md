# Estado final del sistema — junio 2026

Snapshot del estado de producción tras la sesión de configuración + fixes.

## ✅ Operativo 100% en LIVE

### Infraestructura
- **API**: https://clicktoeat-api.lumiaaisolutions.com (Hostinger VPS, LSPHP 8.3)
- **Web**: https://clicktoeat.lumiaaisolutions.com (Hostinger nodejs/Passenger)
- **DB**: MySQL managed (`localhost`)
- **Healthchecks**: `/up` (Laravel default) → 200

### Pagos (Stripe LIVE)
- Cuenta Stripe: `acct_1TPnLARxHYFQWlid` (México, MXN)
- Charges enabled: ✅
- 3 planes:
  - **Esencial** $99 MXN/mes — `price_1Tj2wURxHYFQWlidyJApyhhu`
  - **Profesional** $299 MXN/mes — `price_1Tj2xjRxHYFQWlidu2NlkPnp`
  - **Premium** $499 MXN/mes — `price_1Tj2yuRxHYFQWlidv1w1u75c`
- Webhook: `we_1Tj31sRxHYFQWlidqboydSrH` apuntando a `/api/v1/billing/webhook`
  con 10 eventos (checkout.session.completed, customer.subscription.*,
  invoice.payment_*)
- Trial de 14 días en cualquier plan

### Mail (SMTP Hostinger)
- Buzón real: `fernando@lumiaaisolutions.com`
- Alias visible: `contacto@lumiaaisolutions.com` (los correos salen como contacto)
- Host: smtp.hostinger.com:465 SSL
- Verificado con test SMTP enviado a Gmail ✅

### Módulos super_admin (`/admin/...`)
| Módulo | Estado |
|---|---|
| Resumen, Locales, SaaS | ✅ |
| Anuncios globales | ✅ |
| Cupones globales | ✅ |
| Newsletter | ✅ |
| Soporte (tickets) | ✅ |
| Zonas (mapa Leaflet) | ✅ |
| Auditoría | ✅ |
| Emails (editor de templates) | ✅ |

### Owner panel
- Reportes, Venta (POS), Pedidos, Productos, Categorías, Inventario, Compras
- Branding (con selección visual emerald + check, sin código hex)
- Horarios, Equipo, QR, Cupones, Referidos
- Suscripción / Plan / Customer Portal Stripe
- Tickets de soporte (`/admin/ayuda/contactar`)
- Centro de ayuda con tours interactivos (incluye multi-sucursal auto-trigger)

### Notificaciones
- Owner: campanita con polling pedidos + bajo stock
- Super_admin: campanita con tickets abiertos + locales nuevos + pagos fallidos
- Push notifications PWA (VAPID configurado)
- Email transaccional para tickets, password reset, trial, etc.

### Email templates editables
- 9 Mailables conectados al editor (todo el sistema):
  pedido_confirmado, ticket_reply, welcome, trial_will_end, trial_nudge,
  payment_failed, plan_canceled, carrito_abandonado, resumen_semanal
- Fallback al Blade hardcoded si no hay registro activo en BD

### Cron Jobs activos (Hostinger Cron Jobs)
- **Semanal domingos 3am**: `audit-logs:purge --days=365`
- (Pendiente opcional) Cada 1min: `queue:work --stop-when-empty` —
  solo si se cambia QUEUE_CONNECTION=database

### Tests
- 185/185 phpunit verde
- TypeScript strict mode sin errores

## ⏸️ Pendiente opcional (NO bloquea operación)

| Item | Estado | Cómo activar |
|---|---|---|
| Backup diario $6/mes | Dejado pendiente por user | hPanel → VPS → Backups → Add-on |
| Queue worker cron | Sin activar | Setear `QUEUE_CONNECTION=database` + cron `queue:work` cada minuto |
| Sentry DSN | Sin configurar | Crear projects en sentry.io (Laravel + Next.js) y meter DSNs al `.env` |
| MCP key Stripe `rk_live_51TPnLAR...` | Activa (solo lectura) | Puede revocarse desde dashboard Stripe — ya no se usa |

## 🔧 Bugs cazados en esta sesión

Documentados en `docs/runbook/checkout-stripe-live.md`:
1. `StartCheckoutRequest` rechazaba `premium` (validación `in:`)
2. `STRIPE_SUCCESS_URL/CANCEL_URL` no seteadas → redirect a localhost
3. `config('app.frontend_url')` no estaba definido → Mailables apuntando a localhost
4. Frontend leía `data.url`, backend devuelve `session_url` → `/onboarding/undefined`

## Variables `.env` críticas en prod

```bash
# App
APP_URL=https://clicktoeat-api.lumiaaisolutions.com
APP_URL_FRONTEND=https://clicktoeat.lumiaaisolutions.com
FRONTEND_URL=https://clicktoeat.lumiaaisolutions.com

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=fernando@lumiaaisolutions.com
MAIL_PASSWORD=***
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=contacto@lumiaaisolutions.com
MAIL_FROM_NAME=ClickToEat

# Stripe LIVE
STRIPE_PUBLIC_KEY=pk_live_51TPnLAR...VS6
STRIPE_SECRET_KEY=sk_live_51TPnLAR...Us
STRIPE_PRICE_ESSENTIAL=price_1Tj2wURxHYFQWlidyJApyhhu
STRIPE_PRICE_PROFESSIONAL=price_1Tj2xjRxHYFQWlidu2NlkPnp
STRIPE_PRICE_PREMIUM=price_1Tj2yuRxHYFQWlidv1w1u75c
STRIPE_WEBHOOK_SECRET=whsec_lpBHIFky...m
STRIPE_SUCCESS_URL=https://clicktoeat.lumiaaisolutions.com/onboarding?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://clicktoeat.lumiaaisolutions.com/?canceled=true
STRIPE_PORTAL_RETURN_URL=https://clicktoeat.lumiaaisolutions.com/admin/billing

# VAPID (web push)
VAPID_PUBLIC_KEY=***
VAPID_PRIVATE_KEY=***
VAPID_SUBJECT=mailto:contacto@lumiaaisolutions.com

# Queue (default sync por ahora)
QUEUE_CONNECTION=sync
```
