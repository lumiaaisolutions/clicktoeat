# Cómo continuar el proyecto en otra sesión

> **Snapshot al 2026-06-22 cierre de sesión.** Si abres el proyecto en
> una sesión nueva, lee este archivo primero.

## Estado del sistema

**100% operativo en LIVE.** Cualquier cliente puede registrarse y pagar
con tarjeta real, y el ciclo de cobro automático tras el trial está cerrado.
**API con hardening de seguridad completo** del audit del 2026-06-19. Web
está sirviendo el bundle del Jun 18 (rollback tras outage NPROC) — falta
re-deploy con el fix sileo `5d2cdc5` después de aplicar env vars de Capa 1.

| Capa | URL | Estado |
|------|-----|--------|
| Frontend | https://clicktoeat.lumiaaisolutions.com | 🟢 Up (bundle Jun 18, pre-audit) |
| API | https://clicktoeat-api.lumiaaisolutions.com | 🟢 Up con audit `08e41a2` aplicado |
| BD | MySQL managed en VPS Hostinger | 🟢 Up |
| Stripe | LIVE mode, `acct_1TPnLARxHYFQWlid` | 🟢 Charges enabled |
| Mail | SMTP Hostinger `contacto@lumiaaisolutions.com` | 🟢 Funcional |
| Sentry | `lumia-yd.sentry.io` (Laravel + Next.js) | 🟢 Recibiendo errores |

**Health checks:**
```bash
curl -I https://clicktoeat.lumiaaisolutions.com/        # 200
curl -I https://clicktoeat-api.lumiaaisolutions.com/up  # 200 + 5 headers de seguridad
```

## Tests + commit actual

- **231/231 phpunit verde** en main (incluye SEV-12 + SEV-2 backend half).
- TypeScript estricto OK, Next.js build OK.
- **Todos los commits del 2026-06-22 pusheados a GitHub**.
- **API deployada a prod el 2026-06-22 15:18 UTC** (commit `bffb908`).
  Health check OK + headers de seguridad verificados live.
- Web prod sigue con bundle viejo Jun 18 (rollback NPROC), pendiente de
  re-deploy (acciones manuales del owner).

## Auditoría integral de seguridad — 2026-06-19/20

Bloques rojo + naranja + amarillo aplicados. Avance al 2026-06-22 cierre:

- **17 de 18 hallazgos resueltos en código** (94%).
- **SEV-12 cerrado el 2026-06-22**: 4 controllers con Policy nueva
  (Cupon, Horario, Local.update, Review admin) + 9 con inline auth
  documentada como intencional.
- **SEV-18 cerrado completo el 2026-06-22**: Dependabot + npm audit
  signatures + SBOM CycloneDX workflow + pre-commit gitleaks + runbook.
- **SEV-6 cerrado el 2026-06-20**.
- **SEV-2 con plan ejecutable en ADR-010** — único crítico restante,
  sprint dedicado de ~1 semana.
- **API en prod tiene todos los hardening live** (verificado con `curl -sI`).
- Web los tendrá tras el próximo deploy (bloqueado por pendiente de
  env vars NPROC — ver `docs/PENDIENTES.md` items 1-2).

Detalles, estado por SEV y roadmap restante:
[`docs/security/auditoria-integral-2026-06-19.md`](security/auditoria-integral-2026-06-19.md).

## Backups Hostinger (confirmado 2026-06-20)

Verificado via API Hostinger (`GET /api/vps/v1/virtual-machines/1698236/actions`)
que los backups diarios automáticos están activos:
- 2026-06-20 04:34Z ✓
- 2026-06-13 04:41Z ✓
- 2026-06-06 04:48Z ✓
- 2026-05-30 07:21Z ✓

El pendiente "Activar backup diario" del `PENDIENTES.md` ya está cerrado.

## Stripe LIVE — configurado

- **3 planes activos**:
  - Esencial $99 MXN/mes — `price_1Tj2wURxHYFQWlidyJApyhhu`
  - Profesional $299 MXN/mes — `price_1Tj2xjRxHYFQWlidu2NlkPnp`
  - Premium $499 MXN/mes — `price_1Tj2yuRxHYFQWlidv1w1u75c`
- **Webhook** `we_1Tj31sRxHYFQWlidqboydSrH` → `/api/v1/billing/webhook` (10 eventos enabled)
- **Trial 14 días** en cualquier plan
- **Premium**: SIN integración con ERP/cocina externa (removido por decisión del producto)
- **Trial manual del super_admin**: cubierto end-to-end (ver §"Ciclo del trial" abajo)

## Ciclo del trial (verificado end-to-end al 2026-06-18)

```
Día 0:  Local creado → trial_ends_at = +14d
        ├─ Stripe checkout → Stripe maneja todo (vía webhook)
        └─ Super_admin manual → auto-heal en /me + auto-set en updateBilling

Día 3:  Email automático "Cómo va tu local"
Día 7:  Email automático "Aprovecha estas features"
Día 13: Email automático "Última oportunidad — agrega tarjeta"
        Banner amber: "Termina en 1 día"

(En cualquier momento, owner pulsa "Agregar tarjeta y activar")
        → Stripe Checkout muestra "MXN 0.00 due today"
        → Cliente captura tarjeta → cobro $0
        → Stripe guarda método de pago

Día 14: trial_ends_at expira
        ├─ Si capturó tarjeta:
        │   Stripe cobra $299 automático → webhook → status=active
        └─ Si NO capturó:
            Cron `trials:expire-manual` 10:30am → status=incomplete
            → PlanInactiveScreen bloquea todo el admin
            → Solo deja navegar a /billing y /perfil
```

**Lo importante**: el cliente nunca tiene que hacer nada manual al
expirar el trial. Stripe cobra solo gracias a `subscription_data.trial_end`
que `BillingController::activateExisting` ahora pasa correctamente.

## Crons activos en hPanel

| Cron | Schedule | Comando |
|------|----------|---------|
| Trial nudge emails (día 3/7/14/ending) | Diario 10:00 AM | Inline en `bootstrap/app.php` |
| Expira trials manuales vencidos | Diario 10:30 AM | `php artisan trials:expire-manual` |
| Purga audit logs | Domingos 3:00 AM | `php artisan audit-logs:purge --days=365` |
| Purga locales borrados | Domingos 3:30 AM | `php artisan locales:purge --days=15` |
| Carrito abandonado | Cada 15 min | Inline |
| Resumen semanal owners | Domingos 8:00 PM | Inline |

El cron maestro `* * * * * php artisan schedule:run` ya está en hPanel — los nuevos schedules se ejecutan automáticamente sin acción manual.

## Módulos implementados (lista completa al 2026-06-18)

### Panel super_admin
- Resumen + Locales (filtro Borrados + grace 15 días)
- **Usuarios del local**: ahora permite **editar nombre/email** + reset password (F100f)
- SaaS metrics (MRR, churn, ARPU)
- Anuncios globales, Cupones globales, Newsletter, Soporte, Zonas
- **Auditoría con timeline visual** (agrupada por día, avatares por rol, badges por tipo de acción)
- **Email templates con botones "Insertar dato"** en el cursor (sin exponer `{{ tokens }}` técnicos)

### Panel owner
- Inicio, Reportes, **POS con modal cantidad + extras + dropdown categoría**, **Pedidos con cards visuales**
- Productos, Categorías, Inventario, Compras (Profesional+)
- **Branding con toggle "¿Cuentas con servicio a domicilio?"** que afecta landing
- Horarios, Equipo, QR, Cupones (con horarios), Calificaciones, Referidos
- **Sucursales** (placeholder informativo, feature `multi_sucursal` plan Premium)
- Suscripción (Customer Portal Stripe + `/billing/activate-existing` para trials manuales)
- Aprende a usar (centro de ayuda con tours interactivos + **botón "Volver a ver tutoriales"**)

### Sidebar admin organizado por bloques
- Inicio · **Operación** (Venta, Pedidos, Reportes) · **Catálogo** (Productos, Categorías, Inventario, Compras) · **Clientes** (Cupones, Calificaciones, Referidos) · **Configuración** (Horarios, QR, Branding, Equipo, Sucursales) · **Cuenta** (Suscripción, Historial) · **Ayuda**

### Landing pública (`/{slug}`)
- Hero con branding del local
- Banner de cupón destacado activo AHORA
- Catálogo con categorías + productos
- Checkout → WhatsApp deep link
- Footer con datos + "Ir a ClickToEat"
- **Respeta `delivery.activo`** (si owner lo apagó, solo muestra "Recoger")
- Sección de calificaciones

### Landing principal (directorio)
- **Hero con orbs interactivos** (rojo/verde/naranja) que reaccionan al cursor
- Sección "Pinned Food Story" con scroll-driven cross-fade (mobile arreglado en sesión 2026-06-18)
- Pricing section, footer, etc.

### Onboarding del owner
- 6 pasos: cuenta → local → identidad → contacto → resumen → finalizar
- **Captura `?ref=` y propaga al backend** (componente `RefCapture` global)
- Color picker con input hex + paletas sugeridas

## ⏸️ Pendiente solo de TI (no requiere código)

| # | Item | Tiempo | Cómo |
|---|---|---|---|
| 1 | Activar backup diario $6/mes | 2 min | hPanel → VPS → Backups → Add-on |
| 2 | Probar flow E2E con tu tarjeta | 15 min | Registro real + Stripe trial → cancelar antes de 14 días |
| 3 | Revocar MCP key Stripe `rk_live_51TPnLAR...` | 1 min | Dashboard Stripe → Developers → API keys → Revoke |
| 4 | **App móvil**: `cd apps/mobile && npx eas init` | 5 min | Genera `projectId` para push en builds |
| 5 | **App móvil**: subir `assets/sounds/bell.mp3` | 5 min | Sin esto la campana es no-op |
| 6 | **App móvil**: Apple Developer ($99/año) | 24h aprob | Para TestFlight + App Store |
| 7 | **App móvil**: Google Play ($25 one-time) | inmediato | Para internal testing + Play Store |

## 📱 App móvil ClickToEat — implementada 2026-06-19/20

**Estado**: 66 archivos TypeScript en `apps/mobile/`, typecheck limpio.
Expo SDK 56 + Expo Router + NativeWind v4 + Zustand + TanStack Query.

**Paridad funcional con el panel web** salvo lo que conscientemente vive
mejor en escritorio (POS offline, editor de extras, recetas, upload de
imágenes con cropper, newsletter/templates de email, webhooks outgoing).

### Pantallas
- 4 tabs principales: Inicio (dashboard) · Pedidos (cola en vivo con polling 10s + campana + haptics) · Buscar (`/search`) · Más (menú agrupado)
- Pedidos: detalle con flujo completo de estados (confirmar → preparando → listo → en_camino → entregado) + cancelar
- Catálogo: Productos (toggle disponibilidad + edit precio/descuento/promo) · Categorías (crear + toggle) · Cupones (toggle)
- Inventario: lista con badge bajo stock → detalle + ajuste (entrada/ajuste/merma) + movimientos
- Compras a proveedor (lectura)
- Negocio: Reviews moderación · Staff (lectura) · Branding (info local + colores + lealtad)
- Horarios (editor por día + cerrado_temporal)
- Notificaciones in-app · Multi-sucursal switcher · Tickets de soporte (crear)
- Audit log (gated 402 con CTA al panel web)
- Super admin (solo `rol === 'super_admin'`): locales (suspender/reactivar) · SaaS metrics · Anuncios globales

### Backend agregado
- Tabla `mobile_devices` (migration `2026_06_19_120000`)
- `POST /api/v1/mobile/register-device` + `unregister-device` (auth + tenant + throttle 20/min)
- `ExpoPushSender` (HTTP a `exp.host/--/api/v2/push/send`)
- `PushDispatcher` — fan-out unificado web + móvil
- `OrderService::crear` ahora usa `PushDispatcher` con `data.route` para deep-link
- **SEV-11 fix**: 409 cross-user en lugar de reasignación silenciosa
- `MobileDeviceRegistrationTest` (6 casos cubren registro, idempotencia, cross-user, unregister, auth, validación)

### Docs nuevos en esta sesión
- [`docs/features/app-movil-clicktoeat.md`](features/app-movil-clicktoeat.md) — plan + estado + decisiones
- [`docs/api/mobile.md`](api/mobile.md) — endpoints
- [`docs/architecture/push-dispatcher.md`](architecture/push-dispatcher.md) — patrón fan-out
- [`docs/security/sev-11-mobile-device-token-reassignment.md`](security/sev-11-mobile-device-token-reassignment.md)
- [`docs/runbook/arrancar-app-movil.md`](runbook/arrancar-app-movil.md) — dev / EAS / TestFlight
- `docs/database/schema.md` — sección `mobile_devices`

### Lo que NO se construyó (decisión consciente)
- Productos: crear desde cero con extras/toppings + upload imagen
- POS con offline + idempotency
- Recetas (UI de árbol ingrediente↔producto)
- Newsletter, email templates editables, cupones globales, webhooks outgoing
- Centro de aprendizaje
- Migrar polling 10s → Reverb WebSocket (esperar feedback de batería real)
- Tracking de repartidor en mapa (futuro)

## 🟨 Otras features documentadas pero NO implementadas

Estos son planes en `docs/features/` listos para cuando sean necesarios:

| Item | Doc | Cuándo conviene |
|---|---|---|
| API pública para terceros | `api-publica-y-ab-testing.md` | Cliente la pide |
| A/B testing de menú | `api-publica-y-ab-testing.md` | Local con >50 pedidos/día |
| Pre-pago Stripe Connect cliente final | (sin doc específico) | Requiere onboarding técnico del owner |
| Tracking de repartidor en mapa | (sin doc específico) | Premium feature futura |
| Multi-idioma de landing | (sin doc específico) | Zonas turísticas |
| **Self-service alta de sucursales** | `pos-listas-tours-sucursales-emails-auditoria-2026-06-18.md` | Cliente Premium con cadena lo pida — hoy es asistido por soporte |

## 📚 Documentación clave para futuras sesiones

### Cronología sesión 2026-06-19/20 — App móvil + SEV-11

- `docs/features/app-movil-clicktoeat.md` — plan completo + estado real + decisiones aplicadas
- `docs/api/mobile.md` — endpoints `/mobile/register-device` + `/mobile/unregister-device`
- `docs/architecture/push-dispatcher.md` — patrón fan-out web + móvil
- `docs/security/sev-11-mobile-device-token-reassignment.md` — hardening del registro
- `docs/runbook/arrancar-app-movil.md` — dev, EAS, TestFlight, OTA

### Cronología de la sesión 2026-06-17 + 2026-06-18 (nuevos)

- `docs/features/fixes-branding-billing-2026-06-17.md` — precio Premium, integraciones, fuentes
- `docs/features/fixes-pedidos-reviews-fuentes-2026-06-17b.md` — link calificación, retroceder estado
- `docs/features/ticket-branding-link-calif-2026-06-17c.md` — ticket con branding + descarga PNG
- `docs/features/sidebar-referidos-branding-ticket-2026-06-17d.md` — sidebar secciones + color picker hex
- `docs/features/borrar-pedido-delivery-ticket-referidos-2026-06-17e.md` — borrar pedido + toggle delivery + ReferralFlowTest
- `docs/features/pos-listas-tours-sucursales-emails-auditoria-2026-06-18.md` — POS modal + lista cards + sidebar Sucursales + emails sin etiquetas + auditoría timeline
- `docs/features/orbs-mobile-foodstory-2026-06-18b.md` — hero interactivo + fix mobile
- `docs/features/billing-trial-manual-tours-reset-2026-06-18c.md` — auto-heal trial + botón reset tours
- `docs/features/billing-activate-existing-2026-06-18d.md` — endpoint para activar local existente
- `docs/features/expirar-trials-manuales-2026-06-18e.md` — cron expira trials manuales
- `docs/features/stripe-trial-end-respected-2026-06-18f.md` — Stripe no cobra hoy, respeta trial_end

### De referencia permanente

- **`docs/runbook/estado-final-junio-2026.md`** — snapshot detallado
- **`docs/runbook/checkout-stripe-live.md`** — bugs del checkout y resolución
- **`docs/runbook/configurar-mail-stripe-vapid-prod.md`** — variables `.env` críticas
- **`docs/runbook/activar-queue-database.md`** — cómo activar queue worker si crece volumen
- **`docs/features/feature-gating.md`** — qué módulo está en qué plan
- **`docs/architecture/multi-tenancy.md`** — TenantScope (NO desactivar nunca sin where local_id)

## 🛠️ Cómo deployar después de cambios

```bash
# 1. Verificar local primero
cd apps/api && php vendor/phpunit/phpunit/phpunit       # 194/194 verde
cd apps/web && npx tsc --noEmit && npm run build

# 2. Commit + push
git add . && git commit -m "..." && git push origin main

# 3. Deploy API
export SSH_KEY=$HOME/.ssh/id_ed25519
./scripts/deploy-api.sh --skip-tests             # (tests ya pasaron local)

# 4. Deploy Web (si NEXT_PUBLIC_* cambió, exporta la env)
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
8. **Endpoint `/billing/activate-existing`** SIEMPRE debe pasar `trial_end` en `subscription_data` si el local sigue en trial — sin eso Stripe cobra inmediato (bug de UX crítico arreglado el 2026-06-18).

## Demo data (locales)

Tras `php artisan db:seed`:
- `admin@ClickToEat.app` / `password123` — super_admin
- `owner+tacos-el-gordo@ClickToEat.app` / `password123` — owner
- `owner+pizza-bambino@ClickToEat.app` / `password123` — owner

URLs:
- Directorio: https://clicktoeat.lumiaaisolutions.com
- Login: https://clicktoeat.lumiaaisolutions.com/login
- API docs: https://clicktoeat-api.lumiaaisolutions.com/api/documentation
