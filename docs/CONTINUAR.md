# Cómo continuar el proyecto en otra sesión

> **Snapshot al 2026-06-17.** Si abres el proyecto en una sesión nueva,
> lee este archivo primero.

## Estado del sistema

**100% operativo en LIVE.** Cualquier cliente puede registrarse y pagar
con tarjeta real desde ya.

| Capa | URL | Estado |
|------|-----|--------|
| Frontend | https://clicktoeat.lumiaaisolutions.com | ✅ Up |
| API | https://clicktoeat-api.lumiaaisolutions.com | ✅ Up |
| BD | MySQL managed en VPS Hostinger | ✅ Up |
| Stripe | LIVE mode, `acct_1TPnLARxHYFQWlid` | ✅ Charges enabled |
| Mail | SMTP Hostinger `contacto@lumiaaisolutions.com` | ✅ Funcional |
| Sentry | `lumia-yd.sentry.io` (Laravel + Next.js) | ✅ Recibiendo errores |

**Health checks:**
```bash
curl -I https://clicktoeat.lumiaaisolutions.com/        # 200
curl -I https://clicktoeat-api.lumiaaisolutions.com/up  # 200
```

## Stripe LIVE — configurado

- **3 planes activos**:
  - Esencial $99 MXN/mes — `price_1Tj2wURxHYFQWlidyJApyhhu`
  - Profesional $299 MXN/mes — `price_1Tj2xjRxHYFQWlidu2NlkPnp`
  - Premium $499 MXN/mes — `price_1Tj2yuRxHYFQWlidv1w1u75c`
- **Webhook** `we_1Tj31sRxHYFQWlidqboydSrH` → `/api/v1/billing/webhook` (10 eventos enabled)
- **Trial 14 días** en cualquier plan
- **Premium**: SIN integración con ERP/cocina externa (removido por decisión del producto)

## Crons activos en hPanel

| Cron | Schedule | Comando |
|------|----------|---------|
| Purga audit logs | Domingos 3:00 AM | `php artisan audit-logs:purge --days=365` |
| Purga locales borrados | Domingos 3:30 AM | `php artisan locales:purge --days=15` |

## Módulos implementados (lista completa)

### Panel super_admin
- Resumen + Locales (con filtro "Borrados" + grace period 15 días)
- SaaS metrics (MRR, churn, ARPU)
- Anuncios globales (banner en todos los locales)
- Cupones globales (replicar a todos)
- Newsletter (mass mail)
- Soporte (tickets)
- Zonas (mapa Leaflet con ventas por ciudad)
- Auditoría global
- Email templates editables (9 Mailables conectados)
- Centro de actividad (campanita con tickets/locales/pagos fallidos)

### Panel owner
- Inicio, Reportes, Punto de venta (POS con modo offline), Pedidos
- Productos, Categorías, Inventario, Compras (Profesional+)
- Branding (selección visual + sin código hex)
- Horarios, Equipo, QR, Cupones (con horarios), Calificaciones, Referidos
- Suscripción (Customer Portal Stripe + cambio de plan manual)
- **Aprende a usar** (centro de aprendizaje con 6 animaciones SVG)
- Centro de ayuda (tours interactivos)

### Landing pública (`/{slug}`)
- Hero con branding del local
- Banner de cupón destacado activo AHORA (sticky top con horario)
- Catálogo con categorías + productos
- Carrito con cupón aplicado
- Checkout → WhatsApp deep link
- Sección de calificaciones (1-5 estrellas + comentarios)
- Footer con datos del local

### Onboarding del owner
- 6 pasos: cuenta → local → identidad → contacto → **resumen** → finalizar
- URL auto-generada del nombre (sin "slug" técnico)
- Color picker sin código hex (8 paletas + custom)
- Mapa con geolocalización en step contacto
- Botón "Atrás" en cada paso, estado preservado

## ⏸️ Pendiente solo de TI (no requiere código)

| # | Item | Tiempo | Cómo |
|---|---|---|---|
| 1 | Activar backup diario $6/mes | 2 min | hPanel → VPS → Backups → Add-on |
| 2 | Probar flow E2E con tu tarjeta | 15 min | Registro real + Stripe trial → cancelar antes de 14 días |
| 3 | Revocar MCP key Stripe `rk_live_51TPnLAR...` | 1 min | Dashboard Stripe → Developers → API keys → Revoke |

## 🟨 Features documentadas pero NO implementadas

Estos son planes en `docs/features/` listos para cuando sean necesarios:

| Item | Doc | Cuándo conviene |
|---|---|---|
| App móvil React Native | `app-movil-clicktoeat.md` | 50+ locales pagando |
| API pública para terceros | `api-publica-y-ab-testing.md` | Cliente la pide |
| A/B testing de menú | `api-publica-y-ab-testing.md` | Local con >50 pedidos/día |
| Pre-pago Stripe Connect cliente final | (sin doc específico) | Requiere onboarding técnico del owner |
| Tracking de repartidor en mapa | (sin doc específico) | Premium feature futura |
| Multi-idioma de landing | (sin doc específico) | Zonas turísticas |

## 📚 Documentación clave para futuras sesiones

- **`docs/runbook/estado-final-junio-2026.md`** — snapshot detallado del estado actual
- **`docs/runbook/checkout-stripe-live.md`** — bugs del checkout y cómo se resolvieron
- **`docs/runbook/configurar-mail-stripe-vapid-prod.md`** — variables `.env` críticas
- **`docs/runbook/activar-queue-database.md`** — cómo activar queue worker si crece volumen
- **`docs/features/feature-gating.md`** — qué módulo está en qué plan
- **`docs/architecture/multi-tenancy.md`** — TenantScope (NO desactivar nunca sin where local_id)
- **`docs/testing/fixes-junio-2026.md`** — los 9 bugs de tests que se arreglaron

## 🛠️ Cómo deployar después de cambios

```bash
# 1. Verificar local primero
cd apps/api && php vendor/bin/phpunit            # debe dar 185/185 verde
cd apps/web && npm run typecheck && npm run build

# 2. Commit + push
git add . && git commit -m "..." && git push origin main

# 3. Deploy API
export SSH_KEY=$HOME/.ssh/id_ed25519
./scripts/deploy-api.sh --skip-tests             # (tests ya pasaron local)

# 4. Deploy Web (si NEXT_PUBLIC_* cambió, exporta la env)
export NEXT_PUBLIC_SENTRY_DSN=https://7dba9e4b717e93196533787340c0fc1d@o4511283539738624.ingest.us.sentry.io/4511582389010432
./scripts/deploy-web.sh
```

## 🔐 Credenciales en producción

Variables ya configuradas en `/home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env`:

- `MAIL_*` (USERNAME=fernando@lumiaaisolutions.com, alias contacto@)
- `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*` (3), `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`
- `APP_URL_FRONTEND=https://clicktoeat.lumiaaisolutions.com`
- `SENTRY_LARAVEL_DSN`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `QUEUE_CONNECTION=sync` (cambiar a database + agregar cron worker si se hace newsletter > 200)

**Si necesitas verificarlas**:
```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 \
  "grep -E '^(MAIL_|STRIPE_|SENTRY_|VAPID_|QUEUE_)' /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env | sed 's/=.*/=SET/'"
```

## ⚠️ Reglas críticas que NO se deben romper

1. **Nunca** `DB::table('productos')` — salta TenantScope, usa `Producto::query()`.
2. **Nunca** rotar `APP_KEY` sin coordinar — cierra todas las sesiones.
3. **Nunca** commitear `apps/api/.env`.
4. Migraciones siempre **aditivas** (`ADD COLUMN`, `CREATE TABLE`). Si tocan enum / change column / SQL específico de MySQL, **guard** con
   `if (DB::connection()->getDriverName() !== 'mysql') return;`
5. **Toda** validación pasa por FormRequest (Model::unguard activo).
6. **Toda** respuesta JSON pasa por Resource.
7. Documentación NUEVA va a `docs/<carpeta-temática>/` — nunca consolidar en uno.

## Demo data (locales)

Tras `php artisan db:seed`:
- `admin@ClickToEat.app` / `password123` — super_admin
- `owner+tacos-el-gordo@ClickToEat.app` / `password123` — owner
- `owner+pizza-bambino@ClickToEat.app` / `password123` — owner

URLs:
- Directorio: https://clicktoeat.lumiaaisolutions.com
- Login: https://clicktoeat.lumiaaisolutions.com/login
- API docs: https://clicktoeat-api.lumiaaisolutions.com/api/documentation
