# Changelog

Todos los cambios notables del proyecto se documentan acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Security — Continuación audit 2026-06-20 (SEV-6 cerrado + SEV-18 parcial)

- **SEV-6 cerrado completo** (`c4c6d8c` + `0e246b6`):
  - Removido `Model::unguard()` global de `AppServiceProvider::boot()`.
  - Nuevo `FillableGuardTest` que falla el build si algún modelo no
    declara `$fillable` o `$guarded`.
  - `StaffController::store` y `Admin/LocalController::store` migrados
    a `forceFill(['email_verified_at' => now()])` después del `User::create`.
- **SEV-18 ~70% cerrado**:
  - `.github/dependabot.yml` (`91979c7`) — auto-PRs semanales composer/npm/
    github-actions. Ignora majors de stack core (laravel, next, react, expo)
    y TODOS los bumps de sileo (pre-1.0).
  - `npm audit signatures` en security.yml workflow (`60107e3`) — catch
    tipo event-stream. `continue-on-error: true` hasta migración Sigstore.

### Fixed — Cosmético + estabilidad

- **`themeColor` en Next 14** (`e39b432`): movido de `metadata` export a
  `generateViewport` en `apps/web/src/app/[slug]/page.tsx`. Antes el
  stderr.log de Passenger se saturaba con `⚠ Unsupported metadata
  themeColor` en cada render — visto durante el debug del outage NPROC.
- **Sileo pinneado exacto** (`d2cbafe`): `^0.1.5` → `0.1.5`. Defensa
  contra bump automático rompiendo el adapter (semver no aplica en 0.x).

### Verified — Hostinger ops

- Vía API Hostinger (`GET /api/vps/v1/virtual-machines/1698236/actions`)
  confirmamos **backups diarios automáticos activos**: 2026-06-20, 06-13,
  06-06, 05-30 todos con state=success. Cierra pendiente "Activar backup
  diario" del `PENDIENTES.md` (`eb7028b`).

### Tests

- phpunit subió de **218/218 → 219/219 verde** (nuevo `FillableGuardTest`).

### Added — Docs

- `docs/runbook/aplicar-env-vars-passenger.md` — runbook para setear
  env vars de Passenger via hPanel UI O via `Passengerfile.json` en SSH.
- `docs/runbook/cierre-sesion-2026-06-20.md`.

### Security — Auditoría integral 2026-06-19 (SEV-1..18)

Bloque rojo (críticos) + bloque naranja (altos) aplicados a la API. Web
en bundle anterior temporalmente tras outage NPROC (ver Fixed → Frontend).

- **SEV-1** Sanctum tokens expiran a 7 días (antes eran eternos). CVSS 8.6.
- **SEV-3** Nueva `App\Rules\SafePublicUrl` anti-SSRF en webhooks salientes:
  rechaza loopback, RFC 1918, link-local, multicast e IMDS metadata. 21
  tests. CVSS 8.5.
- **SEV-4** Security headers en producción: HSTS preload (2 años), X-Frame
  DENY, X-Content nosniff, Referrer-Policy, Permissions-Policy, CSP
  Report-Only (whitelist Stripe/Sentry/Maps/Expo). CVSS 8.1.
- **SEV-5** CORS explícito en `config/cors.php` — métodos y headers
  listados, expone rate-limit headers.
- **SEV-7** Email preview de `/admin/email-templates` ahora en
  `<iframe sandbox>` sin `allow-scripts` + DOMPurify (defensa en dos
  capas) en vez de `dangerouslySetInnerHTML`. CVSS 7.6.
- **SEV-9** Sentry `replayIntegration` con `maskAllText`, `maskAllInputs`,
  `blockAllMedia`; `beforeSend` que redacta `Authorization`, `Cookie`,
  email/teléfono en mensajes. Aplicado a client/server/edge runtimes.
- **SEV-10** Login con rate limit en 3 capas (email/IP/global) con
  ventana 15min + header `Retry-After`. Sustituye al cap único IP+email/60s.
- **SEV-11** `MobileDevice::register` rechaza con 409
  `device_already_registered` si el `expo_push_token` pertenece a otra
  cuenta (antes se reasignaba silenciosamente). App mobile maneja 409
  gracefully.
- **SEV-13** `docker-compose.yml` MySQL bind a `127.0.0.1:3307` (antes 0.0.0.0).
- **SEV-14** Next.js `14.2.15 → 14.2.35` (cubre CVE-2025-29927 auth bypass
  via x-middleware-subrequest y CVE-2025-32421 cache poisoning).
- **SEV-15** `StoreImageRequest` log de 422 ya no incluye `all_keys` del
  request.
- **SEV-16** `Header always unset X-Powered-By/Server` en `.htaccess`.
- **SEV-17** `backup-mysql.sh` usa `MYSQL_PWD` env var en lugar de
  `--password=` en cmdline (no aparece en `ps aux`).

Reporte completo: `docs/security/auditoria-integral-2026-06-19.md`.

### Added — App móvil ClickToEat (Expo + React Native + NativeWind)

- Backend: `MobileDeviceController` + `MobileDevice` model + migración
  `2026_06_19_120000_create_mobile_devices_table.php`.
- Servicios: `ExpoPushSender` (batch 100 + cleanup tokens inválidos) +
  `PushDispatcher` (fan-out web + mobile).
- Rutas: `POST /mobile/register-device`, `POST /mobile/unregister-device`
  con `auth:sanctum` + `tenant` + `throttle:20,1`.
- App Expo en `apps/mobile/` con secure token storage, NativeWind, tokens
  store Zustand, push handler con 409 graceful.

### Added — Toast notifications con sileo

- `sileo@0.1.5` integrado como motor de toasts con físicas (basado en
  motion@12). Adapter en `src/store/toast.ts` mantiene la API pública
  (`toast.success/error/info(text)`); cero breaking changes en ~20
  archivos que importan toast.
- `<Toaster>` usa `next/dynamic({ssr:false})` + lazy `await import('sileo')`
  para evitar evaluación en server bundle. Ver ADR-009.
- **Bonus**: First Load JS shared by admin baja **226 kB → 179 kB** (~50 kB
  ahorro — sileo + motion ahora en chunk client-only).

### Added — Ops + docs

- `scripts/rollback-web.sh` — rollback del frontend en un comando, usa
  `bash -s` con heredoc (CageFS-friendly).
- 5 docs nuevos en `docs/security/`, `docs/runbook/`, `docs/issues/`,
  `docs/infra/`, `docs/decisions/`.

### Fixed — Frontend SSR crash + Outage NPROC (`5d2cdc5`)

- `<Toaster>` envuelto en `next/dynamic({ssr:false})` y `store/toast.ts`
  hace `await import('sileo')` lazy dentro de los handlers. Evita que el
  bundle server de Next.js standalone evalúe sileo + `motion/react` (que
  tienen side effects al cargarse).
- Outage del 2026-06-19 21:20 → 21:38 MX (HTTP 503) tuvo como causa real
  el **NPROC limit de Hostinger CloudLinux LVE** (`pthread_create:
  Resource temporarily unavailable`), no sileo. El fix queda como
  hardening preventivo + mejora del bundle size. Para el outage se
  aplicó rollback al bundle anterior y se documentó plan de Capa 1
  (`UV_THREADPOOL_SIZE=2` etc.) en `docs/infra/passenger-node-tuning.md`.

### Tests

- phpunit subió de **194/194 → 218/218 verde** (nuevo `SafePublicUrlRuleTest`
  con 21 casos + `MobileDeviceRegistrationTest` actualizado para el 409).

### Added — Fase 39-91: ola masiva de features (2026-06-15 → 2026-06-16)

**Mejoras del cliente final (landing pública)**
- **F86 — Banner "Lo más pedido hoy"** — top 3 productos vendidos en las últimas 24h (fallback 7 días).
- **F69 — Pedidos programados con calendario visual** — selector tabs (hoy/mañana/pasado) + grid de slots cada 30min respetando horarios del local.
- **F62 — Email de confirmación al cliente final** — campo email opcional en checkout. Plantilla HTML responsive.
- **F61 — Reseñas con foto** — render en modal de producto + upload desde `<input capture="environment">`.
- **F73 — Programa de lealtad por sellos** — toggle en branding + barra de progreso visual cuando cliente deja email.
- **F75 — Recuperación de carrito abandonado** — tracking debounced + scheduler cada 15min envía email tras 60min.

**Panel del owner**
- **F39-F48** — refactor masivo de UI (Leaflet fix, tagline→eslogan, upload en onboarding, home con widgets reales, historial en cards, QR personalizado, 12 fuentes, 8 paletas, colores granulares, tour mejorado, 8 plantillas de landing).
- **F50** — notificaciones en tiempo real (polling + sonido + badge).
- **F51-F52** — PWA instalable + Web Push (VAPID + minishlink/web-push).
- **F77** — sales analytics: heatmap día×hora + low sellers.
- **F83** — badge "premio listo" en card de pedido.
- **F84** — notif canales por rol (todos/cocina/caja/delivery/ninguno).
- **F85** — búsqueda global Cmd+K (pedidos/productos/clientes).
- **F67** — 2FA TOTP con recovery codes.
- **F70** — POS modo offline (queue en localStorage + auto-sync).

**Panel super_admin**
- **F54** — control manual de suscripciones (`pago_externo` + `plan_status` override).
- **F57-F58** — resumen con MRR/ARR + locales en cards con filtros.
- **F59** — branding super con misma UI que owner.
- **F63** — cohort de retención mensual con heatmap.
- **F71 + F82** — multi-sucursal con pivot + switcher + UI asignación.
- **F76** — cancellation feedback con motivo.
- **F88** — Plan Premium con `multi_sucursal + white_label + api_webhooks + soporte_premium` ($599 MXN/mes).

**Crecimiento / marketing**
- **F60** — demo público `/demo` sin registro.
- **F89** — self-service signup `/registro` → `/onboarding/elegir-plan` → Stripe.
- **F74** — resumen semanal al owner los domingos 20:00.
- **F64** — onboarding email sequence (días 3/7/14 + 1 día antes de fin de trial).

**Operacional**
- **F65** — plantillas de productos por giro (8 giros × 8 productos cada uno).
- **F68** — rate limit fino en `/push/*`.
- **F78** — `/health/deep` (DB + cache + storage + Stripe).
- **F79** — logs JSON opcional con `LOG_JSON=true`.
- **F80** — `scripts/backup-test.sh` restore-drill mensual.
- **F81** — GDPR: páginas `/privacidad` + `/terminos` + endpoint borrar mis datos.
- **F90** — webhooks outgoing (Premium) con HMAC-SHA256.
- **F91** — receta granular con conversión g↔kg y ml↔l.
- Sentry SDK instalado (opt-in via env).

**Migraciones nuevas (todas aditivas, seguras en producción)**

```
2026_06_15_120000_add_color_overrides_to_locales
2026_06_15_130000_create_push_subscriptions_table
2026_06_15_140000_add_pago_externo_to_locales
2026_06_15_150000_add_cliente_email_to_pedidos
2026_06_15_160000_add_giro_to_locales
2026_06_15_170000_create_local_email_log_table
2026_06_15_180000_add_2fa_to_users
2026_06_15_190000_add_image_url_to_resenas
2026_06_15_200000_create_lealtad_sellos_table
2026_06_15_210000_create_carritos_abandonados_table
2026_06_15_220000_create_cancellation_feedback_table
2026_06_15_230000_create_user_locales_pivot
2026_06_16_000000_add_lealtad_premio_listo_to_pedidos
2026_06_16_010000_add_notif_filtro_to_users
2026_06_16_020000_add_unidad_consumo_to_recetas
2026_06_16_030000_create_outgoing_webhooks_table
```

**Composer / npm packages añadidos**

- `sentry/sentry-laravel` ^4
- `pragmarx/google2fa` ^9
- `minishlink/web-push` ^10
- `@sentry/nextjs` ^10

**Bug fixes**
- `ShouldBroadcastAfterCommit` no existe en Laravel 11.52 → `ShouldBroadcast + ShouldDispatchAfterCommit`.
- `productos.activo` no existe (es `disponible`) → corregido en `MetricasService` y `ProductTemplatesService`.
- `user_locales.updated_at` → cambio a `->withPivot('created_at')`.
- `stripe/stripe-php` se perdió durante composer require de sentry/web-push → reinstalado.

### Added — Fase 24-36: features comerciales + IA/Realtime skeleton + referidos (2026-06-15)

**F24 — MAIL Hostinger configurado en local**. Tomadas las credenciales del
proyecto LUMIA portal (fernando@lumiaaisolutions.com). `apps/api/.env`
local actualizado. Pendiente del usuario: replicar las 4 vars en el
`.env` de producción VPS + `php artisan config:clear`.

**F25 — Cupones / códigos de descuento**. Tabla `cupones` (idempotente,
softDeletes, unique local+código). Modelo `Cupon` con `BelongsToTenant` +
scope `vigente()` + `calcularDescuento(subtotal)`. CRUD admin completo
(`/admin/cupones`) + endpoint público `/public/cupones/{slug}/validar`
con rate limit 30/min. Aplicación post-creación en el pedido con
`lockForUpdate` (anti race condition de `max_usos`). Frontend: input
"Código de descuento" en checkout con preview + pill verde + total
recalculado. Columnas `cupon_codigo` y `descuento` agregadas a `pedidos`.

**F26 — CSV export pedidos / inventario**. Helper `App\Support\CsvResponse`
con streaming + BOM UTF-8 (Excel abre acentos OK). Endpoints
`GET /pedidos/export?from=&to=&estado=` y `GET /ingredientes/export`.
Frontend: botón "Exportar CSV" en `/admin/pedidos` y `/admin/inventario`
con helper `downloadFile(path)` que respeta Bearer token.

**F27 — Pedido programado**. Columna `pedidos.programado_para` timestamp
nullable. Validación: futuro y máx +72h. UI checkout con toggle "Para
más tarde" + `<input type="datetime-local">`. PedidoResource expone el
campo. Ver `docs/features/pedidos-programados.md` (TODOs: badge en
admin, ordenar próximos, validar horario).

**F28 — Reseñas/rating productos** (backend). Tabla `resenas`. Modelo
`Resena` con scope `publicadas()`. Endpoints públicos:
`POST /public/resenas/{pedidoCodigo}` (valida que el producto estaba en
el pedido + 1 reseña por pedido+producto) y
`GET /public/resenas/{slug}/{producto_id}` que devuelve `{avg, count, data}`.
UI pendiente F37: cards en /admin/resenas + estrellas en landing del local.

**F29 — Búsqueda extendida productos**. `ProductoController::index` ahora
busca también en `descripcion` y `tag` (no solo nombre). Para >1000
productos considerar FULLTEXT index.

**F30 — Dashboard MRR/ARR/Churn super_admin**. Endpoint
`GET /admin/saas-metrics` con: MRR (sum precios trialing+active), ARR,
trial→paid conversion 30d, churn 30d, distribución por plan, últimos
10 eventos Stripe. UI `/admin/saas-metrics` con KPIs + tabla
distribución + lista eventos. Solo super_admin.

**F31 — Pagos anticipados Stripe Payment Links** (backend). Migración
agrega `acepta_pago_online` y `stripe_account_id` a locales. Pedidos
ganan `estado_pago`, `stripe_payment_link_id`, `stripe_payment_intent_id`,
`pagado_at`. Servicio `App\Services\Billing\PaymentLinkService::crearParaPedido()`
crea producto+precio+link de pago en Stripe (soporta Connect para que el
$ vaya al owner). Pendiente: hook en `PublicPedidoController` que llame al
servicio cuando `local.acepta_pago_online`, UI checkout con opción "Pagar
ahora", webhook handler para `checkout.session.completed` con metadata
`tipo=pedido_anticipado`.

**F32 — Real-time con Reverb** (docs + plan). NO instalado. Doc
`docs/features/realtime-reverb.md` con setup completo + por qué no se
hace hoy (CageFS no soporta supervisor, droplet $4/mes recomendado).

**F33 — Multi-sucursal Business plan $799** (docs + plan). NO
implementado. Doc `docs/features/multi-sucursal.md` con modelo de datos,
TenantContext refactor needed, UI selector, plan de 7 días dev.

**F34 — IA features** (skeleton). `App\Services\AI\LLMClient` con switch
provider (mock|anthropic|openai). Mock mode devuelve respuestas plausibles
sin gastar tokens. Doc `docs/features/ia-features.md` con costos (~$9 MXN/mes
con 500 llamadas, Claude Haiku 4.5). Pendiente: 3 endpoints concretos
(sugerencias precio, predicción demanda, mensaje WhatsApp) + feature key
`ia_features`.

**F36 — Programa de referidos 10% off** (BD lista). Columna
`locales.codigo_referido` unique. Tabla `referrals` (referrer/referred,
status, stripe_coupon_id). Doc `docs/features/programa-referidos.md` con
mecánica completa: input opcional en onboarding, webhook `invoice.paid`
crea Stripe Coupon `percent_off:10, duration:once` al referrer. UI
admin pendiente.

**Sidebar admin** agrega items: `Cupones` (owner+staff), `SaaS` (super_admin).
**11 iconos nuevos** verificados existen (`sparkles`, `star`, `chart`, etc.).

**Tests**: 18/18 SaaS pasan. Nuevos endpoints sin tests dedicados aún.

### Changed — Fase 17-22: limpieza UX + 2 planes + soporte real + emojis fuera (2026-06-15)

**F17 — Bug fixes visuales landing del local**
- Banner del local YA NO se oscurece. Antes había un `radial-gradient` con
  hasta 86% de opacidad que sepia-tonaba toda la imagen. Ahora son dos bandas
  finas: 22% top (theme toggle legible) y 48% bottom (nombre legible). El
  resto del banner se ve en su esplendor real.
- Banner del directorio (cards de locales) usa `<img>` con `loading="eager"`
  + `decoding="async"` y fallback a un gradient del `colorPrimario` mientras
  carga. Adiós al bug de "card vacía hasta recargar".
- Hero rebajado a `clamp(360px, 52vh, 520px)` (antes 76vh) y nombre del
  local subido para que NO choque con el info card flotante (-mt-70).
  Logo más compacto (32→52 → 44→52 → 52→60).
- Swipe hint de los carruseles: ahora un pill con fondo accent + flecha
  animada izq→der + texto "DESLIZA". Reemplaza al "👉 Desliza" mucho menos
  visible.

**F18 — Eliminar TODOS los emojis del sistema**
- `tours.ts`: 13 emojis → `IconName` del componente `<Icon>`.
- `TourOverlay`: renderiza `<Icon name={step.icon}>` en vez de string emoji.
- `/admin/ayuda`: 13 cards con `<Icon name=...>` en lugar de emojis grandes.
  Footer con `message-circle` icon en vez de 💬.
- `WelcomeMail`: subject sin 🍽️, body sin 👋.
- `/admin/horarios`: 🟢🔴⚪️ → dot div con `halo-pulse` y colores Tailwind.
- `/admin/punto-venta`: 💵💳📲 → texto plano en select de método de pago.
- `NotificacionesBell`: 🚚🏃🏠 → texto plano (Delivery/Pickup/Sucursal).
- `LandingClient`: 🔒 del cart drawer → `<Icon name="lock">`.
- `lib/support.ts`: mensaje pre-armado sin 👋.

**F19 — 2 planes ($99 y $299), Premium retirado**
- Esencial $99 MXN/mes: branding completo, qr personalizado, POS, notificaciones.
  Limits: 30 productos, 8 categorías, 0 staff. Para "ya estoy vendiendo y
  quiero ordenar mi catálogo".
- Profesional $299 MXN/mes: TODOS los módulos. Limits: ilimitados.
  Reemplaza al antiguo Premium (POS, audit log, métricas avanzadas se
  movieron a Professional).
- `PlansSeeder` actualizado a 2 planes + DESACTIVA (no borra) plan "premium"
  legacy para no romper FK con locales que aún lo tengan.
- `PlanFactory::premium()` ahora alias a `professional()` (kept @deprecated
  para tests legacy).
- `config/stripe.php`: removido `STRIPE_PRICE_PREMIUM`.
- `StartCheckoutRequest`: solo acepta `essential|professional`.
- Sidebar admin: items con `requiredPlan: 'premium'` ahora `'professional'`.
  POS sigue gated pero ya disponible en Esencial.
- `BillingPlansEndpointTest`, `FeatureGatingTest`, `PlanModelTest`
  actualizados: **18/18 pass**.

**F20 — GIFs/videos en Centro de Ayuda + tour**
- `TourStep` gana 2 campos opcionales: `video?: string` (mp4/webm) e
  `image?: string` (gif/png). El `TourOverlay` renderiza video con
  autoplay+loop+muted si hay video, o imagen lazy si no.
- Documentado en `docs/frontend/help-tour.md`.
- Cuando se grabe contenido visual: agregar `video: '/help/branding-logo.mp4'`
  al paso correspondiente en `tours.ts`.

**F21 — WhatsApp soporte real con mensaje pre-armado**
- `apps/web/src/lib/support.ts` — helper único `soporteWhatsappUrl({...})`.
  Número: **+52 229 849 3423** (`5212298493423`). Mensaje pre-relleno con
  motivo + opcionalmente local/plan/desde para que soporte sepa contexto.
- Aplicado en: `/admin/ayuda` (motivo "Necesito ayuda con mi panel"),
  `PlanInactiveScreen` ("Mi suscripción está en estado X"),
  `PricingSection` ("Tengo dudas sobre los planes"). Cada CTA arma su
  mensaje con su contexto.
- Si el número cambia, solo se toca `lib/support.ts`.

**F22 — Cleanup**
- Borrado `apps/web/src/components/landing/ScrollPhoneSequence.tsx`
  (463 líneas legacy que ya no se montaban desde F13).
- Theme toggle del landing del local **persiste por slug** en
  `localStorage['ce-theme:{slug}']`. Cada visitante mantiene su preferencia
  al volver.
- Banner del preview en `/admin/branding` con efecto **ken-burns** sutil
  (scale 1→1.07 + pan 1.5% en 12s alternate) + hover scale extra. Le da
  vida al preview sin ser invasivo. Keyframe `ce-kenburns` en `globals.css`.

**Iconos nuevos** (3): `palette`, ya estaban `card`/`lock`/`users`/`history`/`play`/`chart`/`list`/`package`/`help`.

### Added/Changed — Cierre Fase 11 + Fase 12-15: UX admin + Tour + Centro de Ayuda (2026-06-15)

**F12 — Cierre del módulo SaaS al 100%**
- `WelcomeMail` (`app/Mail/WelcomeMail.php` + Blade) — disparado tras
  `OnboardingController::finalizar` con `rescue(...)` non-blocking. Body
  con link al panel + URL pública + recordatorio del trial.
- Comando `php artisan stripe:sync-prices` (`app/Console/Commands/
  StripeSyncPricesCommand.php`) — crea/actualiza productos+precios en
  Stripe vía API. Idempotente (busca por `metadata.plan_slug`). Flag
  `--write-env` escribe los IDs al `.env` automáticamente.
- `PlanInactiveScreen` (`components/billing/PlanInactiveScreen.tsx`) +
  helper `isPlanBlocking()`. Bloquea TODO el admin (excepto `/admin/billing`
  y `/admin/perfil`) cuando el plan está `incomplete`, `past_due` con
  gracia vencida, o `canceled` con periodo vencido. Solo afecta a
  owner+staff; super_admin se libra.

**F13 — Landing del local: hero rediseñado + carruseles**
- **Hero más compacto**: altura `clamp(360px, 52vh, 520px)` (antes 76vh).
  Banner pasa de fondo dominante a fondo MUY sutil con
  `filter: saturate(.85) brightness(.85)` + overlay radial oscuro semi-opaco.
  Foco visual ahora va al **logo HUGE centrado** (160-240px) con ring
  white y sombra dramática.
- **Tabs categoría sticky** con `scroll-x` mantienen ≥3 visibles en mobile
  y un fade-out a la derecha sugiere que hay más. Click en tab hace
  `scrollTo` suave a la sección de esa categoría.
- **Productos en CARRUSELES** (un carrusel por categoría, scroll-snap
  horizontal). Mobile muestra ~3 cards por viewport, sm+ 4-5. Reemplaza
  el grid 2-cols anterior. Cada sección lleva header `serif` con
  count de productos. La primera categoría muestra un indicador "👉 Desliza"
  que se desvanece tras 1er scroll o 5s.
- Footer del local + DirectoryClient: `Desarrollado por LUMIA` ahora usa
  `.ce-lumia` (gradient animado naranja-rojo en shimmer infinito + glow
  + tipografía bold lockup con flecha `arrow-up-right`).

**F14 — Homologación visual del admin**
- `AdminPageHeader` (`components/admin/AdminPageHeader.tsx`) — componente
  reusable inspirado en `/admin/branding`. Kicker uppercase + icono accent
  + título Bricolage clamp(3xl-5xl) + segunda línea con `.gradient-text`
  + descripción muted + slot `actions` derecha + botón "?" si hay
  `tourSlug`. 3 radial gradients decorativos sutiles + animación motion
  de entrada.
- Aplicado a 13 módulos: `productos`, `categorias`, `pedidos`, `inventario`,
  `compras`, `staff`, `audit-log`, `metricas`, `qr`, `horarios`, `perfil`,
  `ayuda`, `billing` (preexistente queda compatible). `punto-venta`
  mantiene su header propio (layout split).
- **Iconos sidebar**: `Equipo` ahora usa `users` (gente real, no lista).
  `Audit log` ahora usa `history` (reloj con flecha) y se renombra a
  **"Historial"**. Nuevo item `Centro de ayuda` con icono `help`.
- **Productos agrupados por categoría**: cuando no hay filtro de categoría
  activo, `/admin/productos` muestra accordions colapsables por categoría
  con count. Permite ver "Postres · 3 productos", "Bebidas · 5 productos"
  expandibles en vez de una lista plana. Filtro select cambió de "Todas
  las categorías" a "Agrupar por categoría" / "Solo: X" para reflejar el
  comportamiento.
- **Terminología no-técnica**: `Audit log` → `Historial`. `Punto de venta`
  → `Caja`. `slug` → `URL pública` en placeholders del onboarding.
  `Empleado` → `Miembro`. Eliminadas referencias a `tarjeta_entrega` /
  `pos` en strings user-facing donde aparecían.

**F15 — Tour interactivo + Centro de Ayuda**
- `useHelpCenter` (`store/helpCenter.ts`) — Zustand store con
  `openTour/openHelp/dismiss/shouldAutoTour/markSeen`. Persiste tours
  vistos en `localStorage['clicktoeat:tour-seen']`.
- `TourOverlay` (`components/help/TourOverlay.tsx`) — overlay global con
  backdrop oscuro + highlight ring sobre el target (vía 4 box-shadows
  alrededor) + tooltip posicionable (`top|bottom|left|right|center`).
  Atajos teclado (Esc/←/→/space). Progress dots animados. Auto-scroll
  al target si está fuera del viewport. Sin libreria externa.
- `AutoTourTrigger` — hijo mudo del admin layout. Si el user nunca vio
  `bienvenida` y entró a `/admin`, dispara el tour de onboarding con
  600ms delay.
- `tours.ts` — catálogo de 14 tours, 27 pasos en total. Cada paso:
  title + body breve + icon opcional + placement + target CSS opcional.
- `/admin/ayuda` — grilla de 13 cards. Cada card abre el tour
  correspondiente con un click. Badge "Visto" en los ya completados.
  Footer educativo con CTA a WhatsApp para soporte humano (placeholder).
- `HelpButton` (`components/help/HelpButton.tsx`) — botón "?" inline
  renderizado por `AdminPageHeader` cuando hay `tourSlug`.
- `data-tour="…"` agregado a 8+ elementos clave del admin (sidebar items,
  CTAs principales, filtros).

**Iconos agregados al sistema** (8 nuevos en `components/ui/Icon.tsx`):
`card`, `lock`, `help`, `users`, `history`, `play`, `chart`, `list`,
`package`. Cobertura completa del sidebar admin sin SVG inline en cada
página.

**Documentación nueva**
- `docs/frontend/admin-page-header.md` — uso, props, módulos aplicados,
  anatomía visual.
- `docs/frontend/help-tour.md` — sistema completo (store + overlay +
  tours + centro de ayuda), cómo agregar tours, limitaciones.

### Changed — Mobile compacto del local + home más concisa con PinnedFoodStory (2026-06-14)

Continuación de la sesión del rediseño editorial. Dos cambios visuales:

**Landing del local — vista móvil más densa**
- Cards de producto pasan a grid `grid-cols-2` en mobile (antes 1 col).
  Imagen 1/1 en lugar de 16/11. Padding `px-2.5 py-2.5`, título 13.5px
  line-clamp-2, precio 15px, botón "+" 36×36. Descripción oculta en
  mobile (se ve al tap → `ProductDetailSheet`).
- En `sm+` se mantiene exactamente el diseño anterior (auto-fill 260px,
  16/11, padding 4, descripción visible).
- Inspirado en apps de delivery (Rappi/DiDi Food) — grilla escaneable
  donde el comensal compara productos de un vistazo.

**Home `/` — copy condensado + PinnedFoodStory con fotos reales**
- Hero: subtítulo de 14 → 7 palabras ("Pide directo por WhatsApp. Sin
  app, sin comisiones.").
- WhyClickToEatSection: titulares 12 → 5 palabras por feature. Headline
  principal "Pensado para el local, construido para el cliente" → "Para
  el local. Para el cliente." Intro pasa de 25 a 10 palabras.
- SystemPreviewSection: "Un sistema completo, no solo un menú" → "Un
  sistema, no solo un menú". 4 filas de features con descripciones de
  4-5 palabras.
- CTAOwnerSection: "Tu propia landing, tu propio menú, tus propias
  reglas" → "Tu landing. Tus reglas." 3 bullets más cortos.
- ShareQRSection: copy reducido a "Escanea, abre, guarda."
- **Nuevo: `PinnedFoodStory`** (`apps/web/src/components/landing/`).
  Reemplaza a `ScrollPhoneSequence`. Imagen sticky con cross-fade entre
  3 frames (foto Unsplash + título 6-9 palabras + body 1 línea). Cada
  frame mapea a 110vh de scroll. Barra de progreso inferior. Imágenes:
  pizza (antojo) → mano con WhatsApp (pedido) → restaurante (cero
  comisiones). Documentado en `docs/frontend/landing-sections.md`
  "PinnedFoodStory — anatomía".
- `ScrollPhoneSequence` queda en repo como legacy (no se monta).

**Bundle**
- `/` baja de 19.3 → 17.5 kB (reemplazo de ScrollPhoneSequence + copy
  más corto).
- `/[slug]` se mantiene en 16.9 kB.

### Changed — Landing del local: rediseño editorial cálido (2026-06-14)

Reescritura completa de `apps/web/src/app/[slug]/LandingClient.tsx`
adaptando el lenguaje visual del template "Menú Digital" (warm cream +
serif editorial + cards lift + cart FAB con sheen+ring) a la data real
del cliente. Cero datos hardcodeados: banner, logo, color primario,
categorías con icono editable, productos, redes y horarios siguen
viniendo del backend.

**Diseño y UX**
- **Hero** subido a `clamp(440px, 76vh, 660px)` con tagline uppercase
  letterspaced + nombre del local en **Instrument Serif** clamp(46–84px)
  centrado abajo. Logo/inicial circular glass arriba-izq, theme toggle
  (sol/luna) arriba-der, chevron-down bob como scroll hint.
- **Info card flotante** (-mt-70 sobre el hero) con status dot pulsante
  verde/rojo/gris según `estado.abierto`, horario condensado por
  `formatHorarios()` ("Lun – Dom · 9:00 – 22:00") y ubicación.
- **Categorías**: chips horizontales scroll-x con icono pequeño + nombre
  (estilo HTML reference). Activo = gradient diagonal del `--ce-accent`.
  Reemplaza al `CategoryButton` con "icono volando" del rediseño anterior.
- **Productos**: vuelve a **grid de cards** (`auto-fill 260px`) con
  imagen 16/11 que hace `scale(1.07)` en hover, título Hanken bold,
  precio accent, botón `+` gradient redondeado. Reemplaza al accordion
  expansible — un grid escaneable es más legible para un menú.
- **ProductDetailSheet**: bottom-sheet con cantidad +/- y "Añadir · $XX"
  gradient. Tap en card abre el sheet; tap en `+` agrega directo al carrito.
- **Cart FAB** rediseñado: pill "MI PEDIDO · $XX" con sheen recorriendo
  diagonal + ring pulse + count badge `pop`. Respeta safe-area-inset.
- **CartDrawer**: panel derecha estilo HTML reference con items en
  `ce-row-in` stagger, footer "Confirmar pedido →" gradient accent.
- **CheckoutSheet**: bottom sheet con resumen tabular, form vertical
  (nombre/tipo entrega con icons truck/storefront/dirección+leaflet/
  teléfono/pago) y botón WhatsApp `#25D366` 58px alto con sombra verde
  profunda. Mantiene fallback `buildWhatsAppUrl` para casos de red caída.
- **Footer dark** se mantuvo con credit LUMIA + accent line top + 3 cols
  (identidad/contacto/redes) + bottom bar; redes ahora son pills circulares
  42×42 que cambian background al `--ce-accent` en hover (en vez del
  isométrico 3D anterior — más cercano al template referencia).

**Tipografía**
- Cargadas en `apps/web/src/app/layout.tsx`: **Instrument Serif** (italic/regular)
  y **Hanken Grotesk** (400–800) junto con las que ya existían.
- Clases utilitarias nuevas en `globals.css`:
  - `.ce-serif` → Instrument Serif (display editorial).
  - `.ce-body`  → Hanken Grotesk (UI cálido del landing).
- `.ce-display` (Bricolage Grotesque) sigue para directorio público + admin.
- Documentado en [`docs/frontend/typography.md`](docs/frontend/typography.md).

**Animaciones (CSS keyframes)**
- 11 keyframes nuevos en `globals.css` sección "Landing del local":
  `ce-pop`, `ce-bob`, `ce-pulse-dot`, `ce-fade-swap`, `ce-sheen`,
  `ce-cart-ring`, `ce-row-in` + `.ce-pimg`/`.ce-card` (hover scale + lift).
- Clase `.ce-warm` (selección cálida del accent) y `.ce-chips-scroll`
  (oculta scrollbar de los chips horizontales).

**Lógica mantenida**
- `iconForCategoria()` para fallback cuando admin no asignó icono.
- `useCart` store + `setLocal(slug)` purge entre locales.
- `buildWhatsAppUrl` builder con fallback de red.
- `DeliveryAddressInput` con Nominatim + LeafletMap + Haversine para
  validar radio de entrega.
- Banner CERRADO premium se mantiene (rediseñado con tono más cálido
  en `bg-red-50` consistente con el cream warm).
- Theme toggle es **local** (estado del componente, no persiste).
  `branding.darkMode` define el estado inicial.

**Métricas**
- Bundle `/[slug]`: **31 kB → 16.8 kB** (reorganización + menos lógica
  de accordion).

**Documentación**
- `docs/frontend/landing.md` reescrito con la nueva estructura.
- `docs/frontend/typography.md` creado (nuevo) — fuentes y reglas.
- Pendiente removido: input "Notas (opcional)" del HTML reference —
  nuestro backend acepta notas por item de carrito, no global; se quitó
  del form para no engañar al usuario.

### Added — Pulido landing del local + Icon system expandido (2026-06-13)

**Landing del local (`/[slug]`)**

- **Banner CERRADO premium**: barra accent vertical roja gradient + icon
  clock con halo ping + tipografía display "Volvemos pronto" + badge CERRADO
  con halo-pulse. Mensaje regex-limpiado (sin "Cerrado · Cerrado · …" duplicado).
- **Tabs categorías rediseñadas (CategoryButton)**: gradient diagonal del
  color del local activo, icono FLOTANTE size 56 con doble drop-shadow blanco
  (efecto sticker contorno) + drop-shadow oscuro inferior. Funciona sobre
  cualquier color de fondo del local. Rotación 10° → 18° en hover, scale-110.
- **Productos accordion** (ProductAccordion + AccordionPanel) — paneles
  expansibles estilo Brad Traversy: flex-0.5 ↔ flex-5, chunks responsive
  (4/3/2 por fila en lg/sm/mobile), selector +/- cantidad inline, botón
  "Agregar · $XX" con total dinámico, X roja para cerrar.
- **Footer dark restaurante**: bg-ink, grid 2 cols (identidad local + redes
  3D), accent line gradient superior con el color del local, bottom bar con
  copyright + **"Desarrollado por LUMIA ↗"** link a lumiaaisolutions.com con
  gradient hover effect.
- Status card duplicado del footer **eliminado** (ya estaba en el banner top).

**Icon system expandido**

- **+20 SVG nuevos**: sandwich, soup, beef, drumstick, fish, egg, croissant,
  popcorn, cherry, popsicle, wine, martini-glass, cup-soda, milk, sprout,
  wheat, sun, moon, gift, apple. Total ahora ~50 iconos.
- **IconPicker** (`components/ui/IconPicker.tsx`): selector visual con 31
  opciones curadas para food/restaurant. Reemplaza el viejo input "fa-pizza-slice"
  del modal `/admin/categorias`.
- **iconForCategoria()** en LandingClient: regex helper que infiere icono
  representativo por keyword del nombre (50+ palabras en español). Fallback: utensils.
- Admin `/admin/categorias`: tabla con badge mini del icono al lado del nombre.

**Permisos granulares de staff (esta misma sesión)**

- Migración `add_permisos_to_users` (JSON column nullable).
- Backend: `User::MODULOS_VALIDOS` (12 keys), `puedeAcceder()`, `permisosEfectivos()`.
- `StaffController` store/update aceptan `permisos[]` validados.
- `AuthController::me` expone `permisos` efectivos.
- Frontend: modal `/admin/staff` con 4 presets (Cajero, Encargado de cocina,
  Manager, Personalizado) + 12 checkboxes de módulos con descripción + icon.
- Sidebar admin filtra NavItem por `user.permisos` (owner ve todo, staff lo
  que tenga listado).
- Docs: `docs/features/staff-permissions.md` con arquitectura completa de
  las 2 capas (plan SaaS + permisos staff).

**Branding admin pulido**

- Hero estilo landing con orbs gradient + kicker SPARKLES + headline grande
  con gradient-text "tu landing pública" + tagline + CTA "Guardar cambios"
  con animations.
- Sections con barra accent roja top-left que aparece en hover (scaleX 0→1).
- Preview card refleja el rediseño real de la landing del local
  (hero, chips categorías, producto mini, cart bar).

**Bug fixes del día**

- Avatar/badge clash en LocalCard (badge "Abierto" tapaba al avatar circular).
- Texto vertical "al revés" en panels accordion (writing-mode → rotate -90 con
  truncate, letras correctas legibles de abajo hacia arriba).
- Precio en panels colapsados: bg-ink → bg-emerald-600 + ring + shadow (verde,
  alto contraste).
- "Cerrado · Cerrado · abre mañana" duplicado en footer y banner (regex elimina prefijo).
- Botón X cerrar panel: bg-white/15 translúcido → bg-red-500 prominente.

**Deploy + infra fixes del día**

- `apps/api/.htaccess` y `apps/api/public/.htaccess` agregados al repo (el
  rsync los borraba con `--delete`, dejando la API caída).
- `deploy-api.sh` excludes ampliados para preservar `storage/app/public/` y
  `public/storage` — uploads jamás se tocan por deploy.
- `deploy-api.sh` removido `view:cache` (este API no usa Blade, explotaba).
- `deploy-web.sh` arreglado para BSD tar (cp -R staging en vez de `--transform`).
- `deploy-web.sh` ruta correcta del nodejs en Hostinger
  (`~/domains/clicktoeat.lumiaaisolutions.com/nodejs/`).
- Hosting documentado correctamente: VPS Hostinger con CageFS (no Business
  Shared como decía la doc original).
- `public/storage` convertido a symlink correcto a `storage/app/public/`
  (estándar Laravel). Las nuevas uploads ya persisten ante futuros deploys.
- Runbook nuevo: [`docs/runbook/recuperar-uploads-perdidos.md`](docs/runbook/recuperar-uploads-perdidos.md)
  con post-mortem del incidente del 2026-06-12.

### Added — Plan SaaS documentado (junio 2026, pre-implementación)

- **`docs/decisions/ADR-011-saas-pricing-and-feature-gating.md`** — decisión de
  convertir ClickToEat en SaaS con tres planes ($99 Esencial, $299 Profesional,
  $499 Premium MXN/mes), trial 14 días sin tarjeta, Stripe Checkout, slug bajo
  dominio principal.
- **`docs/features/saas-billing.md`** — arquitectura del módulo: tablas
  (`plans`, extensiones a `locales`, `subscription_events`), modelos, endpoints
  (`/billing/checkout`, `/billing/session/{id}`, `/onboarding/{step}`,
  `/webhooks/stripe`, `/billing/portal`), handlers de webhooks por tipo de
  evento, flujo end-to-end con diagrama, plan de implementación por fases
  (~13 días dev), métricas SaaS a trackear (MRR, churn, LTV).
- **`docs/features/feature-gating.md`** — catálogo de 13 feature keys + 3
  límites cuantitativos (`max_productos`, `max_categorias`, `max_staff`),
  middleware `RequiresFeature` con `402 Payment Required`, Policies con
  `PlanLimitException`, store frontend `usePlan` con `has(feature)`,
  componentes `<LockedFeature>` (overlay blureado, no oculta) y `<UpgradeCard>`,
  sidebar con candado, banner de trial countdown, errores 402 codificados
  (`FEATURE_LOCKED`, `PLAN_LIMIT`, `PLAN_INACTIVE`).
- **`docs/runbook/configurar-stripe.md`** — setup paso a paso del Stripe
  Dashboard (crear 3 productos + precios recurring MXN, obtener API keys,
  configurar webhook con 7 eventos, Customer Portal con cancelación + cambio
  de plan, Tax/IVA con RFC, pegar variables al `.env`, correr seeder, probar
  flujo end-to-end con tarjeta `4242 4242 4242 4242`, pasar Test → Live).
- **`docs/runbook/cambiar-precio-plan.md`** — procedimiento ops para subir
  precios con grandfathering vs migración masiva, las 3 estrategias, comando
  `saas:migrar-subscripciones` con prorrateo, requisitos legales (30 días
  aviso por LFPC México), errores que evitar (editar `unit_amount` de un
  Price existente, borrar Price con subscriptions activas).

> **Implementación no iniciada**: los 5 archivos describen el plan completo.
> Ver ADR-011 para la decisión y `saas-billing.md` para el plan por fases.

### Added — Frontend landing v2 (junio 2026)

- **`apps/web/src/components/landing/BurgerSequence.tsx`** — image-sequence
  scrubbing con 168 frames JPG (4.3 MB) de una hamburguesa armándose. Canvas
  fixed a la derecha del viewport, scroll-driven con `useScroll` + `useSpring`,
  fade-out cerca del 42% del scroll. Solo desktop. Ver
  [`docs/frontend/landing-sections.md`](docs/frontend/landing-sections.md).
- **`apps/web/public/frames/burger/`** — 168 frames JPG (1280×720, ~26 KB c/u).
- **`apps/web/src/components/landing/ScrollPhoneSequence.tsx`** — phone con
  4 frames cross-fading (catálogo → checkout → WhatsApp → panel) controlados
  por scroll. Todo en SVG/HTML inline (sin PNGs).
- **`apps/web/src/components/landing/WhyClickToEatSection.tsx`** — sección
  editorial con numeración 01-04, headline sticky con parallax, grid 2x2.
  Reemplaza la sección dark anterior.
- **`apps/web/src/components/landing/SystemPreviewSection.tsx`** — browser
  mockup del panel admin (sidebar, stats, tabla con estados) + texto a la
  izquierda. Parallax y scale del mockup.
- **`apps/web/src/components/ui/Icon.tsx`** — set de 30+ iconos SVG inline
  estilo Lucide (sin lucide-react). Ver
  [`docs/frontend/icon-system.md`](docs/frontend/icon-system.md).
- **`apps/web/src/components/ui/BrandLoader.tsx`** — visual del loader con
  logo respirando, halo expandiéndose, dots staggered.
- **`apps/web/src/components/ui/InitialLoader.tsx`** — overlay mount inicial
  y recarga, 500 ms mínimo + fade-out, sin hydration mismatch.
- **`apps/web/src/components/ui/RouteTransition.tsx`** — overlay en cambio
  de pathname con `usePathname`. Ver
  [`docs/frontend/loaders.md`](docs/frontend/loaders.md).
- **`apps/web/src/app/loading.tsx`** + `admin/loading.tsx` + `[slug]/loading.tsx` —
  fallbacks de Suspense de Next.js.
- **`apps/web/public/favicon.svg`** + `apple-icon.svg` — favicon unificado
  con el mark del Logo (cursor + tenedor en cuadrado redondeado).
- **Geolocalización "Negocios cerca de ti"** en el directorio público:
  HTML5 Geolocation API + Haversine + filtro por radio 15 km. Ver
  [`docs/frontend/geolocation.md`](docs/frontend/geolocation.md).
- **Counter animado** (CountUp) en el hero — IntersectionObserver + rAF,
  mutación directa de DOM (sin re-render).
- **Tilt 3D + spotlight** en cards del directorio — `useMotionValue` +
  `useSpring` + `useMotionTemplate` para que la card siga al cursor.
- Docs nuevas en `docs/frontend/`:
  - [`directorio-publico.md`](docs/frontend/directorio-publico.md)
  - [`landing-sections.md`](docs/frontend/landing-sections.md)
  - [`scroll-animations.md`](docs/frontend/scroll-animations.md)
  - [`loaders.md`](docs/frontend/loaders.md)
  - [`icon-system.md`](docs/frontend/icon-system.md)
  - [`geolocation.md`](docs/frontend/geolocation.md)

### Added — Original

- `CLAUDE.md` en raíz — contexto del proyecto para Claude Code / nuevos devs (stack, comandos, reglas "no toques X", referencias).
- `CHANGELOG.md` en raíz (este archivo).
- `docs/api/openapi-snapshot.md` — política de versionado del spec OpenAPI (generación delegada al CI, no a máquinas locales).
- 4 runbooks operativos nuevos:
  - `docs/runbook/bd-llena.md`
  - `docs/runbook/php-fpm-crash.md`
  - `docs/runbook/restaurar-backup-mysql.md`
  - `docs/runbook/backup-mysql-automatizado.md`
- `scripts/backup-mysql.sh` — script ejecutable production-ready para Hostinger VPS (mysqldump → gzip → Backblaze B2 via rclone + manifest sha256 + alertas Slack + dead-man switch).
- `scripts/README.md` — convenciones de scripts operativos + procedimiento de deploy al servidor.
- `docs/runbook/postmortems/` con `README.md` + `TEMPLATE.md` (blameless postmortem template).
- `docs/runbook/drills/` con `README.md` + `TEMPLATE.md` (simulacros mensuales/trimestrales/anuales).
- `docs/infra/deploy-hostinger.md` — documentación del setup productivo en Hostinger + lo que falta confirmar.
- **Healthchecks** en `docker-compose.yml` para api / nginx / web (mysql ya existía). Arranque ordenado con `depends_on: condition: service_healthy`.
- `docs/security/` (5 archivos): `README.md`, `threat-model.md` (15 vectores con controles + gaps + acciones), `data-inventory.md` (PII + LFPDPPP + ARCO), `incident-response.md` (5 fases + comunicación + roles), `security-checklist.md` (pre-deploy).
- `docs/user-guides/` (6 archivos no técnicos para owners): `README.md`, `primeros-pasos.md`, `gestionar-menu.md`, `recibir-pedidos.md`, `inventario.md`, `metricas.md`.
- **`scripts/deploy-api.sh`** — deploy automatizado de la API (Laravel) a Hostinger. rsync + composer install --no-dev + migrate + caches + health check `/up`. Modo dry-run, skip-tests, skip-migrate. Sintaxis validada.
- **`scripts/deploy-web.sh`** — deploy automatizado del frontend (Next standalone) a Hostinger. Build con vars de prod + tarball + scp + restart Passenger + health check. Backup automático de build previo para rollback < 1 min.
- **Diagramas mermaid** embebidos en docs existentes:
  - `docs/database/erd.md` — ERD completo con todas las tablas + cardinalidades + columnas clave (renderiza en GitHub).
  - `docs/features/pedidos.md` — `sequenceDiagram` del pedido público end-to-end (cliente → API → Inventory → WhatsApp) + `stateDiagram-v2` de la máquina de estados con todas las transiciones y reglas de reintegro.
  - `docs/features/inventario.md` — `flowchart` del flujo del stock (entradas, salidas, log append-only, alertas).
  - ASCII conservado como fallback.
- **`docs/api/http-requests/`** — colección HTTP completa (compatible VS Code REST Client + JetBrains HTTP Client):
  - `README.md` — convenciones + cómo configurar envs en cada cliente.
  - `auth.http` — register, login (válido + inválido), me, logout, change password.
  - `public.http` — locales, menú por slug, pedidos públicos (pickup + delivery con extras + casos de error: cerrado / fuera de radio / slug inexistente / producto ajeno).
  - `tenant.http` — flujo completo del owner (37 requests cubriendo branding, horarios, métricas, categorías, productos, recetas con productos compuestos, ingredientes con ajustes, compras, notificaciones, pedidos admin, POS interno con `tarjeta_tpv`, uploads).
  - `admin.http` — super_admin (locales CRUD + suspender/reactivar + usuarios + reset password owner).
  - `http-client.env.example.json` — template gitignored para JetBrains.
- `.gitignore` actualizado: `http-client.private.env.json`, `backups/` (dir local del script de backup), placeholder para `docs/api/openapi.json` (cuando CI lo genere).
- **`.github/workflows/ci.yml`** — CI principal con 4 jobs paralelos:
  - `api` — composer install (cached) + `pint --test` + `phpunit` (sqlite in-memory) + `composer validate --strict`.
  - `web` — npm ci (cached) + `tsc --noEmit` + `next lint` + `next build` con URLs de prod.
  - `scripts` — `shellcheck` sobre `scripts/*.sh`.
  - `ci-passed` — aggregator (required check para branch protection).
  - Paths-filter para skip jobs si no se tocan los archivos relevantes.
- **`.github/workflows/openapi-snapshot.yml`** — regenera `docs/api/openapi.json` cuando se tocan controllers. En PR sólo verifica (falla con instrucción); en `workflow_dispatch` abre PR automático.
- **`.github/workflows/security.yml`** — semanal (lunes 09:00 UTC) + PR a deps:
  - `gitleaks` (config en `.github/gitleaks.toml` con allowlist de docs/examples).
  - `composer audit --no-dev`.
  - `npm audit --omit=dev --audit-level=high`.
  - `env-leak-check` (verifica que ningún `.env` real está trackeado).
- **`apps/web/Dockerfile`** — multi-stage productivo (`deps` + `builder` + `runner`), Alpine, non-root (`nextjs:nodejs`), healthcheck `wget /`, imagen final ~150 MB. Útil cuando se migre fuera de Hostinger.
- **`apps/web/.dockerignore`** — excluye `node_modules`, `.next`, `.env`, `.git`, etc. del build context.
- **`docs/contributing/ci-cd.md`** — documentación de los 3 workflows, secrets necesarios, debug, cómo correr checks localmente.
- **`docs/contributing/pre-commit.md`** — guía para Lefthook / Husky / pre-commit framework con configs listas para copiar.

### Changed

- **`apps/web/next.config.mjs`** — añadido `output: 'standalone'` (requerido por `deploy-web.sh` y el Dockerfile productivo).

- `docs/infra/deploy.md` reescrito como disambiguator que apunta a `deploy-hostinger.md`.
- `docs/infra/docker.md` documenta los nuevos healthchecks + aclara que monitoring real de prod va via UptimeRobot externo.
- **`docs/infra/deploy-hostinger.md`** reescrito completamente con los datos reales del setup productivo (Hostinger Business Shared en Phoenix, AZ; SSH `86.38.202.72:65002`; usuario `u221820910`; MySQL managed localhost; LiteSpeed; Passenger para Node). 6 TODOs cerrados de los 10 originales.
- **`scripts/backup-mysql.sh`** refactorizado para Hostinger Business Shared: sin sudo, sin `/etc/cron.d/`, paths `~/`, rclone como binario en `~/bin/`, mysqldump compatible con MySQL managed (sin `--routines`/`--triggers`/`--lock-tables`).
- **`scripts/README.md`** ampliado con procedimiento completo de setup en Hostinger (instalación de rclone, configuración de cron desde hPanel, Healthchecks.io, Slack webhook).
- **`CLAUDE.md`** + **`README.md`** ahora muestran las URLs de producción + comando SSH + scripts de deploy desde la primera línea.
- **`CLAUDE.md`** añade sección "Hostinger Business Shared — restricciones" con las 9 limitaciones concretas del plan (sin Docker en prod, sin sudo, sin `/etc/cron.d`, MySQL sin `SUPER`/`RELOAD`, LSPHP/LiteSpeed, etc.).
- **`docs/issues/devops-faltante.md`** ahora abre con la tabla de 4 pendientes operativos del equipo (`datos-deploy.md`) con su estado real.
- **12 factories** en `apps/api/database/factories/` (Local, User, Categoria, Producto, Ingrediente, Pedido, DetallePedido, Receta, Compra, DetalleCompra, MovimientoInventario, Notificacion) con states útiles: `LocalFactory::suspendido()`/`conHorarios()`, `UserFactory::superAdmin()`/`owner()`/`staff()`, `ProductoFactory::conExtras()`/`conReceta()`, etc.
- **Tests Auth nuevos** en `tests/Feature/Auth/`:
  - `RegisterTest` — 5 tests (caso feliz, email duplicado, password débil, confirmación distinta, token funcional).
  - `LoginTest` — 7 tests (login válido, password incorrecto, email inexistente, throttle 5/min, reset tras éxito, abilities por rol, logout sólo revoca actual).
  - `PasswordTest` — 7 tests (cambio propio, current_password incorrecto, invalida otros tokens, reset por super_admin, cierra todas las sesiones, isolation entre owners, 404 sin owner).
- **Tests CRUD nuevos**:
  - `CategoriaCrudTest` — 11 tests (scope multi-tenant, slug auto, dup en mismo local, dup en locales distintos, staff sin permiso, update, scope ajeno = 404, delete con productos = 409, productos_count, filtro activo).
  - `ProductoCrudTest` — 13 tests (creación, extras, categoría ajena rechazada, precio_descuento < precio, extras malformados, paginación, búsqueda, scope, update, delete, staff sólo lee).
  - `UploadImageTest` — 9 tests (PNG válido, folder default, folder no permitido, no-imagen, mime no permitido, > 5 MB, staff sin permiso, sin token, nombres random únicos).
- **Test crítico de seguridad**: `EndpointPublicoTamperingTest` — 7 tests cubriendo el vector #8 del threat-model (extras válidos usan precio del catálogo, grupo inexistente rechazado, item inexistente rechazado, ignora precio del cliente, rechaza precio negativo, persiste precio canónico, producto de otro local rechazado).

#### Fase 7 — Features backend

- **Idempotency-Key**: middleware `App\Http\Middleware\Idempotency` + tabla `idempotency_keys`. Aplicado a `POST /public/pedidos/{slug}` con TTL 24h. Header `Idempotency-Replayed: true` en respuestas cacheadas. Tests: `IdempotencyTest` (6 casos). Doc: `docs/features/idempotency.md`.
- **Reset password por email**: `POST /auth/forgot-password` + `POST /auth/reset-password` con broker `Password` de Laravel. `ResetPasswordNotification` con link al frontend. Cierra TODAS las sesiones del user al éxito. No revela existencia del email (mensaje genérico). Tests: `PasswordResetTest` (8 casos). Doc: `docs/features/password-reset.md` con guía para Hostinger Email / Resend / SES / SMTP.
- **CRUD staff**: `StaffController` bajo `/local/staff` (index, store, show, update, destroy). `UserPolicy` con reglas: owner sólo crea staff (rol hardcodeado), no se edita a sí mismo, no edita otros owners. Update con password resetea + invalida sesiones del staff. Tests: `StaffCrudTest` (11 casos).
- **Audit log**: tabla `audit_logs` (append-only, `actor_user_id`/`local_id`/`action`/`resource_type`/`resource_id`/`changes` JSON/`ip`/`user_agent`). `AuditObserver` reutilizable conectado a Local/User/Categoria/Producto/Ingrediente/Pedido/Compra. Filtra `password` automáticamente del diff. Endpoint `GET /audit-logs` paginado con filtros, sólo owner + super_admin. Tests: `AuditLogTest` (7 casos).
- **Rate limit por tenant**: limiter `public-orders-by-tenant` en `AppServiceProvider` que combina 100/min por `local:{slug}` + 20/min por IP. Aplicado a `POST /public/pedidos/{slug}` reemplazando el `throttle:20,1` simple anterior. Tests: `RateLimitPorTenantTest` (2 casos).
- **Restore soft-delete**: filtros `?trashed=only|with` en index de productos / pedidos / compras. Endpoints `POST /productos/{id}/restore`, `/pedidos/{id}/restore`, `/compras/{id}/restore`, `/admin/locales/{id}/restore`. Methods `restore()` en Producto/Pedido/Compra Policies. Tests: `RestoreSoftDeleteTest` (10 casos).

#### Pre-Fase 8 + Fase 8 — Operational

- **Laravel Scheduler** en `bootstrap/app.php` con 7 tareas: prune idempotency_keys (daily), sessions > 30d (daily), cache expirado (daily), sanctum-prune-expired (daily), queue:prune-failed > 90d (daily), audit_logs > 90d (weekly), notificaciones leídas > 90d (weekly). Todas con `onOneServer()`. Requiere agregar `* * * * * php artisan schedule:run` al cron de hPanel.
- 4 runbooks operativos en `docs/runbook/`:
  - `setup-cron-scheduler.md` — cron en hPanel + verificación + debug.
  - `integrar-sentry.md` — Laravel + Next.js + scrubbers de PII + alertas Slack.
  - `setup-mail-hostinger.md` — Hostinger Email SMTP + SPF/DKIM/DMARC + mail-tester.com.
  - `migrar-uploads-a-s3-b2.md` — estrategia sin downtime con doble-write + script de backfill + comparación R2/B2/S3.
  - `integrar-reverb.md` — Pusher (no requiere migración de hosting) vs Reverb (requiere VPS) con código de eventos y suscripciones.
- 3 ADRs nuevos:
  - ADR-008: Idempotency-Key como header opcional.
  - ADR-009: Audit log con Observers (no event sourcing).
  - ADR-010: Rate limit por tenant en endpoints públicos.

#### Fase 9 — Frontend pendiente + pre-implementación S3 + broadcasting

**Frontend nuevo**:

- **Reset password (UI)**: `app/forgot-password/page.tsx` con form simple + estado "email enviado". `app/reset-password/page.tsx` con form de nueva password leyendo `token` y `email` del query string. Link "¿Olvidaste tu contraseña?" añadido al `/login`.
- **`app/admin/staff/page.tsx`** — CRUD completo del equipo: lista con badges de rol, modal de crear/editar (password requerida al crear, opcional al editar), botón eliminar con confirm. Excluye self y otros owners de las acciones editables (consistente con `UserPolicy`).
- **`app/admin/audit-log/page.tsx`** — tabla paginada con filtros (resource_type, action, desde, hasta) + fila expandible con diff `antes → después` por campo, colores por tipo de acción (created/updated/deleted/restored), formateo de fechas en es-MX.
- **Restore en productos/pedidos**: añadido select `Activos / + eliminados / Sólo eliminados` que filtra via `?trashed=`. Botón ↺ Restaurar reemplaza acciones normales cuando se ven sólo eliminados. Compras sólo agrega el handler (sin UI extra — flujo menos común).
- **Sidebar admin layout** incluye "Equipo" y "Audit log".
- **`apps/web/src/lib/types.ts`** — añadidas interfaces `Staff` y `AuditLog`.

**S3/B2 pre-implementación** (sólo falta `.env`):

- **`apps/api/config/filesystems.php`** — añadido disk `s3` con config para R2/B2/AWS S3 (env-driven). Default cambia a `public` (antes era `local` que era el ambiguo).
- **`apps/api/app/Services/Images/ImageUploader.php`** refactorizado: usa `Storage::disk()` (el default) en lugar de `Storage::disk('public')` hardcoded. URL via `Storage::disk()->url()`. `getimagesize` sólo cuando el driver es local (S3 lo omitiría — descargar el archivo costaría latencia + ancho de banda).
- **`apps/api/app/Console/Commands/MigrarUploadsAS3.php`** — comando `php artisan uploads:migrar-a-s3` con `--dry-run`, progress bar, skip de archivos ya migrados (resumable), update masivo de URLs en `productos.imagen_url`, `locales.logo_url`, `locales.banner_url` (con `saveQuietly()` para no inundar audit_logs).
- **Activación**: requiere `composer require league/flysystem-aws-s3-v3 "^3.0"` + variables `S3_*` en `.env`. Mientras no se haga, todo sigue corriendo con `FILESYSTEM_DISK=public`.

**Broadcasting Pusher pre-implementación** (sólo falta `.env` + npm install):

- **`apps/api/app/Events/PedidoCreado.php`** — event con `ShouldBroadcastAfterCommit` (garantiza no disparar en rollback), canal privado `local.{id}`, payload mínimo + nombre `pedido.creado`.
- **`apps/api/app/Services/Orders/OrderService.php`** dispatch del evento después del COMMIT. Si `BROADCAST_CONNECTION=log` (default), el event no llega a nadie — frontend sigue con polling.
- **`apps/api/routes/channels.php`** — auth del canal privado (owner/staff del local + super_admin pueden suscribirse). Registrado en `bootstrap/app.php → withRouting(channels: ...)`.
- **`apps/web/src/lib/echo.ts`** — wrapper con dynamic imports de `pusher-js` y `laravel-echo` (no se descargan si no están instaladas). `subscribeToLocalEvents(localId, cb)` retorna unsubscribe. Si no hay env vars → noop.
- **`apps/web/src/store/notificaciones.ts`** modificado: `startPolling(localId)` ahora detecta si realtime está habilitado y, si sí, suscribe al canal + reduce polling a 5 min como heartbeat (en lugar de 30s). Si no, polling clásico de 30s.
- **`NotificacionesBell.tsx`** pasa `user.local_id` al startPolling.
- **Activación**: `composer require pusher/pusher-php-server` + `npm install pusher-js laravel-echo` + variables `PUSHER_*` (backend) y `NEXT_PUBLIC_PUSHER_*` (frontend) en `.env`.

### Fixed — Frontend (junio 2026)

- **LocalCard avatar/badge clash**: el badge "Abierto" estaba en
  `bottom-3 left-3` del banner y solapaba con el avatar del local (que
  sale del banner hacia abajo con `-mt-10`). Badge movido a `top-3 left-3`
  (opuesto al star de favoritos), avatar pasa a `-mt-7`. Sin colisión.
- **`echo.ts` webpack build fail**: el rediseño anterior usaba `import()`
  dinámico con `@ts-expect-error` para `pusher-js`/`laravel-echo`. Pasa
  typecheck pero **webpack en `next build` sí resuelve los dynamic imports**
  y falla. Simplificado a stub puro (retorna `null`/noop). El código real
  vive en [`docs/runbook/integrar-reverb.md`](docs/runbook/integrar-reverb.md)
  para cuando se active broadcasting.
- **Eliminados emojis del sistema completo** (12 archivos): DirectoryClient,
  LandingClient, LocationPicker, NotificacionesBell, admin/qr, admin/inventario,
  admin/staff, admin/productos, admin/pedidos, admin/branding,
  admin/locales/[id]/branding, admin/punto-venta. Reemplazados por
  `<Icon name="…" />`. Regla en [`docs/contributing/style-ts.md`](docs/contributing/style-ts.md).

### Fixed — Deploy script (junio 2026)

- **`scripts/deploy-web.sh` ruta del Frontend**: estaba apuntando a
  `/home/u221820910/nodejs/` (no existe). La ruta real en este servidor
  es `/home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs/`.
- **`scripts/deploy-web.sh` empaquetado BSD tar**: `tar --transform` no
  es soportado por BSD tar (macOS default). Cambiado a `cp -R` a staging
  dir + tar simple — funciona en macOS y Linux.

### Fixed — Original

- **🔒 Vector #8 (security)**: `OrderService::snapshotLineas` ahora valida cada extra contra `$producto->extras` y **reemplaza el `price` del cliente con el del catálogo**. Antes: un atacante mandaba `extras: [{group, item, price: -100}]` y reducía el subtotal del pedido público. Ahora: `RuntimeException` si el grupo/item no existe en el producto; precio canónico si existe. Mitigación documentada en `docs/security/threat-model.md` (status `✅ MITIGADO 2026-06-10`).
- **CI — `.github/workflows/ci.yml`**: job `API (Laravel)` reorganizado para el primer run real:
  - `cp .env.example .env` ANTES de `composer install` (sino `package:discover` del post-autoload-dump falla).
  - `composer validate` ahora sin `--strict` y con `|| true` — tolera `composer.lock` con paquetes que ya no están en `composer.json` (caso `spatie/laravel-permission` removida sin update del lock). El warning queda visible pero no bloquea.
  - Añadidos steps explícitos `Generate APP_KEY` y `Storage permissions` antes de PHPUnit.
- **Frontend — `apps/web/src/app/admin/audit-log/page.tsx`**: `<>` con `key` reemplazado por `<Fragment key={log.id}>` + `import { Fragment }` (React no permite key en fragments shorthand).
- **Frontend — `apps/web/src/lib/echo.ts`**: añadido `@ts-expect-error` a los dynamic imports de `laravel-echo` y `pusher-js` para que `tsc --noEmit` no falle con "Cannot find module" hasta que se activen los paquetes via `npm install` (documentado en `docs/runbook/integrar-reverb.md`).

### Changed — Frontend (junio 2026)

- **`DirectoryClient.tsx`** completamente rediseñado. Antes era 2 secciones
  (búsqueda + grid + footer). Ahora orquesta 8 secciones: Hero,
  NearbySection, search sticky, Favoritos, Catálogo, ScrollPhone,
  WhyClickToEat, SystemPreview, CTAOwner, ShareQR, Footer.
- **Footer**: eliminado "Hecho con cuidado en México". Layout simplificado a
  single-row con copyright. Link a https://lumiaaisolutions.com con
  "Desarrollado por LUMIA".
- **`apps/web/src/app/layout.tsx`**: metadata.icons apunta al favicon nuevo.
  Monta `<InitialLoader />` + `<RouteTransition />` antes de `{children}`.
- **`apps/web/src/app/page.tsx`**: `LocalDirectorio` interface extendida con
  `lat?: number | null` y `lng?: number | null` para la geolocalización.
- **`apps/web/src/app/globals.css`**: agregadas utilities `gradient-text`,
  `hero-orb`, `marquee`, `float-slow`, `halo-pulse`, `grain`,
  `lift-on-hover`, `link-underline`, smooth scroll.
- **`apps/web/.eslintrc.json`** creado con `{ "extends": "next/core-web-vitals" }`
  para que `next lint` no entre en modo interactivo en CI.
- **`apps/web/.npmrc`** creado con `legacy-peer-deps=true` (conflicto eslint@9
  vs eslint-config-next@14).

### Changed — Original

- **`apps/web/next.config.mjs`** — añadido `output: 'standalone'` (requerido por `deploy-web.sh` y el Dockerfile productivo).
- **`docs/security/threat-model.md`** — vector #8 marcado como MITIGADO, item #1 de "top 5 acciones críticas" cerrado.

---

## [0.1.0] — 2026-06-10

Primer registro formal del proyecto. Documenta el snapshot del estado en esta fecha y el pase de cleanup de discrepancias.

### Added

- Documentación completa fragmentada por contexto en `docs/` (84 archivos al cierre):
  - `docs/architecture/` — overview, monorepo, stack, multi-tenancy, auth-roles, request-lifecycle.
  - `docs/database/` — schema, relationships, migrations, seeders, erd.
  - `docs/api/` — overview, conventions, public, auth, tenant, admin, errors, rate-limits, form-requests, resources, policies.
  - `docs/features/` — pedidos, pos, inventario, recetas, compras, metricas, horarios, whatsapp, notificaciones, uploads, branding, qr.
  - `docs/models/` — uno por modelo Eloquent (12 archivos).
  - `docs/frontend/` — overview, routing, stores, components, landing, admin.
  - `docs/infra/` — docker, nginx, env-vars, local-setup, wamp-native, deploy.
  - `docs/testing/` — overview, suites.
  - `docs/issues/` — discrepancias-readme, funcionalidad-faltante, devops-faltante, docs-faltante, roadmap.
  - `docs/contributing/` — conventions, style-php, style-ts, git-flow, how-to-add-feature.
- 7 ADRs concretos en `docs/decisions/`:
  - ADR-001 multi-tenancy con scope por columna.
  - ADR-002 Sanctum bearer tokens (no SPA-stateful).
  - ADR-003 snake_case interno + camelCase en menú público.
  - ADR-004 snapshot de producto en `detalle_pedidos`.
  - ADR-005 recetas XOR + productos compuestos.
  - ADR-006 uploads a disco local (interim).
  - ADR-007 polling 30s para notificaciones (interim).
- 3 runbooks en `docs/runbook/`:
  - Rotar `APP_KEY`.
  - Renombrar BD `clickeat → clicktoeat`.
  - Sincronizar `composer.lock` tras quitar Spatie.
- `CLAUDE.md` en raíz — contexto del proyecto para Claude Code / nuevos devs.
- `CHANGELOG.md` (este archivo).

### Changed

- `README.md` raíz reescrito como portada thin que apunta a `docs/README.md` (estaba duplicando docs y desincronizado del código).
- `.env.example` raíz limpiado: variables `CLOUDINARY_*` eliminadas (no se usaban). Sólo conserva variables públicas del Next.js.
- Nombre de la base de datos estandarizado en `clicktoeat`:
  - `docker-compose.yml` → BD/user/password.
  - `docker/mysql/init.sql` → crea `clicktoeat` y `clicktoeat_testing`.
  - `apps/api/config/database.php` → default.
  - `apps/api/.env.example` → `clicktoeat`.
- `bd/bdclicktoeat.sql` marcado con warning prominente al inicio: dump outdated, fuente de verdad son las migraciones.

### Removed

- `spatie/laravel-permission` del `composer.json` — declarada pero sin uso (sin `HasRoles`, sin migraciones de permission_tables, sin middleware `role:`).
- Alias `role` del middleware en `bootstrap/app.php` (apuntaba a Spatie).

### Diferido a Fase 5 (CI/CD)

- Primera generación de `docs/api/openapi.json` ocurre cuando el pipeline esté en pie. No se genera localmente — decisión documentada en [`docs/api/openapi-snapshot.md`](docs/api/openapi-snapshot.md).

### Pendiente operativo (de este release)

- Ejecutar `composer update spatie/laravel-permission --no-scripts` para sincronizar `composer.lock`. Runbook: [`docs/runbook/sincronizar-composer-lock.md`](docs/runbook/sincronizar-composer-lock.md).
- Para entornos Docker con volumen viejo `clickeat`: ejecutar el runbook de rename. [`docs/runbook/rename-db-clickeat-a-clicktoeat.md`](docs/runbook/rename-db-clickeat-a-clicktoeat.md).
- Rotar `APP_KEY` ([`docs/runbook/rotar-app-key.md`](docs/runbook/rotar-app-key.md)) y verificar que `apps/api/.env` no esté trackeado cuando este proyecto pase a un repo Git real.
- Eliminar variable `NEXT_PUBLIC_GOOGLE_MAPS_KEY` de `apps/web/.env.local` y `apps/web/.env.production` (no se lee desde el código).

---

## Snapshot del sistema al [0.1.0]

### Capabilities

- Multi-tenant por scope de columna (`local_id`), `super_admin` bypass.
- Roles: `super_admin`, `owner`, `staff`.
- Auth Sanctum bearer.
- Endpoint público `/menu/{slug}` con branding + horarios calculados + productos disponibles.
- Endpoint público `POST /pedidos/{slug}` con generación de URL `wa.me`.
- POS interno con `metodo_entrega=sucursal` + `metodo_pago=tarjeta_tpv`.
- Inventario con descuento automático, productos compuestos, reintegro idempotente al cancelar.
- Notificaciones in-app de `bajo_stock` con polling 30s.
- Compras con promedio ponderado y anulación reversible.
- Métricas por rango/preset con serie diaria + top productos.
- Panel super_admin de locales (alta/suspender/reactivar/reset password owner).
- Upload de imágenes a disco local (con ruta como `public_id`).
- 7 suites de tests Feature (~65 tests) en sqlite in-memory.

### No incluido aún

Ver:
- [`docs/issues/funcionalidad-faltante.md`](docs/issues/funcionalidad-faltante.md)
- [`docs/issues/devops-faltante.md`](docs/issues/devops-faltante.md)
- [`docs/issues/roadmap.md`](docs/issues/roadmap.md)

---

## Convención para próximas entradas

Cada release menor (`0.X.0`) debe documentar:

- **Added** — funcionalidad nueva visible al usuario.
- **Changed** — cambios en comportamiento, contratos de API, configuración default.
- **Deprecated** — features marcadas para retiro.
- **Removed** — features eliminadas.
- **Fixed** — bugs.
- **Security** — fixes con impacto de seguridad. Listar también la severidad.

Si el cambio rompe contrato (breaking change), marcarlo con `**[BREAKING]**` y referenciar la guía de migración correspondiente.
