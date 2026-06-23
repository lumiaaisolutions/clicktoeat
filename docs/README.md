# Documentación de ClickToEat

Documentación viva del proyecto. **Regla**: cada tema vive en su propio `.md` dentro de la carpeta temática correspondiente — no se consolidan temas distintos en un solo archivo.

> Última verificación contra código: **2026-06-17**.

> 🚦 **¿Retomas el proyecto después de un descanso?** Lee en este orden:
> 1. [`PENDIENTES.md`](PENDIENTES.md) — qué falta y qué NO se debe construir
> 2. [`CONTINUAR.md`](CONTINUAR.md) — snapshot del estado actual + cómo deployar
> 3. [`runbook/estado-final-junio-2026.md`](runbook/estado-final-junio-2026.md) — credenciales y configuración detallada

---

## Por dónde empezar

- ¿Primer contacto? → [`architecture/overview.md`](architecture/overview.md)
- ¿Vas a levantar el proyecto? → [`infra/local-setup.md`](infra/local-setup.md) (Docker) o [`infra/wamp-native.md`](infra/wamp-native.md) (nativo)
- ¿Vas a tocar la API? → [`api/overview.md`](api/overview.md) + [`api/conventions.md`](api/conventions.md)
- ¿Vas a tocar la BD? → [`database/schema.md`](database/schema.md)
- ¿Vas a agregar un feature? → [`contributing/how-to-add-feature.md`](contributing/how-to-add-feature.md)

---

## Índice

### Arquitectura
- [Overview](architecture/overview.md) — qué es ClickToEat y cómo encajan las piezas.
- [Monorepo](architecture/monorepo.md) — layout del repo, qué vive dónde.
- [Stack](architecture/stack.md) — versiones de runtime, librerías y dependencias.
- [Multi-tenancy](architecture/multi-tenancy.md) — cómo se aísla cada local en una sola BD.
- [Auth y roles](architecture/auth-roles.md) — Sanctum, abilities, super_admin / owner / staff.
- [Ciclo de petición](architecture/request-lifecycle.md) — middleware, tenant scope, policies.
- [PushDispatcher](architecture/push-dispatcher.md) — fan-out a Web Push (PWA) + Expo Push (app móvil) en una sola llamada.

### Base de datos
- [Esquema (todas las tablas)](database/schema.md)
- [Relaciones y FKs](database/relationships.md)
- [Migraciones](database/migrations.md)
- [Seeders](database/seeders.md)
- [ERD textual](database/erd.md)

### API
- [Overview y convenciones](api/overview.md)
- [Convenciones de respuesta y paginación](api/conventions.md)
- [Endpoints públicos](api/public.md)
- [Endpoints de autenticación](api/auth.md)
- [Endpoints tenant-scoped](api/tenant.md)
- [Endpoints super_admin](api/admin.md)
- [Endpoints app móvil](api/mobile.md) — `/mobile/register-device` + push
- [Errores y códigos HTTP](api/errors.md)
- [Rate limiting](api/rate-limits.md)
- [Form Requests (validación)](api/form-requests.md)
- [Resources (forma de respuesta)](api/resources.md)
- [Policies (autorización)](api/policies.md)
- [Snapshot OpenAPI (política y procedimiento)](api/openapi-snapshot.md)
- [Colección HTTP (VS Code REST Client / JetBrains)](api/http-requests/README.md)

### Features
- [Pedidos (flujo + máquina de estados)](features/pedidos.md)
- [POS interno (sucursal)](features/pos.md)
- [Inventario (ingredientes + movimientos)](features/inventario.md)
- [Recetas (incluye productos compuestos)](features/recetas.md)
- [Compras a proveedor (promedio ponderado)](features/compras.md)
- [Métricas / KPIs](features/metricas.md)
- [Horarios y estado del local](features/horarios.md)
- [WhatsApp (formato de mensaje)](features/whatsapp.md)
- [Notificaciones in-app](features/notificaciones.md)
- [Uploads de imágenes](features/uploads.md)
- [Branding / personalización](features/branding.md)
- [QR del menú](features/qr.md)
- [**Permisos de staff** — qué módulo ve cada empleado](features/staff-permissions.md)
- [**SaaS Billing** — Stripe Checkout + suscripciones](features/saas-billing.md) — 3 planes con trial 14 d
- [**Feature gating** — qué módulo desbloquea cada plan](features/feature-gating.md)
- [**Programa de lealtad** — sellos por cliente](features/lealtad.md)
- [**Webhooks outgoing** — eventos a sistemas externos](features/webhooks-outgoing.md) — sólo Premium
- [**2FA TOTP** — verificación en 2 pasos](features/two-factor.md)
- [**PWA + Web Push** — panel instalable con notificaciones reales](features/web-push-pwa.md)
- [**Carrito abandonado** — recuperación por email](features/carrito-abandonado.md)
- [**Emails transaccionales** — pedido / trial / carrito / resumen semanal](features/emails-transaccionales.md)
- [**Multi-sucursal** — detalle de implementación](features/multi-sucursal-detalle.md)
- [**App móvil iOS+Android** — plan, estado, decisiones](features/app-movil-clicktoeat.md) — Expo SDK 56, 66 archivos TS, paridad con panel web

### Modelos
- [Local](models/local.md)
- [User](models/user.md)
- [Categoria](models/categoria.md)
- [Producto](models/producto.md)
- [Pedido](models/pedido.md)
- [DetallePedido](models/detalle-pedido.md)
- [Ingrediente](models/ingrediente.md)
- [Receta](models/receta.md)
- [MovimientoInventario](models/movimiento-inventario.md)
- [Compra](models/compra.md)
- [DetalleCompra](models/detalle-compra.md)
- [Notificacion](models/notificacion.md)

### Frontend
- [Overview](frontend/overview.md)
- [Routing y páginas](frontend/routing.md)
- [Stores Zustand](frontend/stores.md)
- [Componentes UI](frontend/components.md)
- [Directorio público (home)](frontend/directorio-publico.md)
- [Landing por local (`/[slug]`)](frontend/landing.md)
- [Panel de admin](frontend/admin.md)
- [Secciones modulares de la home](frontend/landing-sections.md) — BurgerSequence, ScrollPhone, WhyClickToEat, SystemPreview, LocalCard
- [Patrones de scroll-animations](frontend/scroll-animations.md) — viewport, parallax, scrubbing, tilt 3D, counter
- [Sistema de loaders](frontend/loaders.md) — InitialLoader, RouteTransition, app/loading.tsx
- [Sistema de iconos](frontend/icon-system.md) — Icon component inline (estilo Lucide, sin lucide-react)
- [Sistema de logo / marca](frontend/brand-logo.md) — Logo.tsx, favicon, apple-icon, assets móvil, reglas de uso
- [Tipografía](frontend/typography.md) — Instrument Serif / Hanken Grotesk / Bricolage / Geist y reglas de uso
- [AdminPageHeader (homologación visual)](frontend/admin-page-header.md) — header reusable estilo branding aplicado a todos los módulos
- [Tour + Centro de Ayuda](frontend/help-tour.md) — sistema de ayuda contextual con highlights y tooltips
- [Geolocalización "Cerca de ti"](frontend/geolocation.md) — geolocation API + Haversine

### Infra / DevOps
- [Docker Compose](infra/docker.md)
- [nginx](infra/nginx.md)
- [Variables de entorno](infra/env-vars.md)
- [Setup local (Docker)](infra/local-setup.md)
- [Setup nativo (WAMP)](infra/wamp-native.md)
- [Despliegue — overview](infra/deploy.md)
- [Despliegue a Hostinger (prod actual)](infra/deploy-hostinger.md)

### Tests
- [Estrategia general](testing/overview.md)
- [Suites PHPUnit](testing/suites.md)

### Issues conocidos / lo que falta
- [Discrepancias README vs código](issues/discrepancias-readme.md)
- [Funcionalidad faltante](issues/funcionalidad-faltante.md)
- [DevOps faltante](issues/devops-faltante.md)
- [Documentación faltante](issues/docs-faltante.md)
- [Roadmap actualizado](issues/roadmap.md)

### Contribución
- [Convenciones generales](contributing/conventions.md)
- [Estilo PHP / Laravel](contributing/style-php.md)
- [Estilo TS / React](contributing/style-ts.md)
- [Git flow](contributing/git-flow.md)
- [Cómo agregar un feature](contributing/how-to-add-feature.md)
- [CI/CD — GitHub Actions](contributing/ci-cd.md)
- [Pre-commit hooks (opcional)](contributing/pre-commit.md)

### Decisiones de arquitectura (ADRs)
- [Plantilla](decisions/ADR-template.md)
- [ADR-001: Multi-tenancy con scope por columna](decisions/ADR-001-single-db-tenancy.md)
- [ADR-002: Sanctum bearer tokens (no SPA-stateful)](decisions/ADR-002-bearer-tokens-sanctum.md)
- [ADR-003: snake_case interno, camelCase en menú público](decisions/ADR-003-snake-vs-camelcase-en-api.md)
- [ADR-004: Snapshot de producto en `detalle_pedidos`](decisions/ADR-004-snapshot-en-detalle-pedidos.md)
- [ADR-005: Recetas XOR + productos compuestos](decisions/ADR-005-recetas-xor-y-productos-compuestos.md)
- [ADR-006: Uploads a disco local (interim)](decisions/ADR-006-uploads-locales-interim.md)
- [ADR-007: Polling cada 30s para notificaciones (interim)](decisions/ADR-007-polling-notificaciones-interim.md)
- [ADR-008: Idempotency-Key como header opcional](decisions/ADR-008-idempotency-key.md)
- [ADR-009: Audit log con Observers (no event sourcing)](decisions/ADR-009-audit-log-via-observers.md)
- [ADR-010: Rate limit por tenant en endpoints públicos críticos](decisions/ADR-010-rate-limit-por-tenant.md)
- [ADR-011: SaaS con 3 planes pagados y feature gating](decisions/ADR-011-saas-pricing-and-feature-gating.md)

### Runbooks
- [Rotar `APP_KEY`](runbook/rotar-app-key.md)
- [`/health/deep` — monitor con uptimerobot](runbook/health-deep.md)
- [Renombrar BD `clickeat` → `clicktoeat`](runbook/rename-db-clickeat-a-clicktoeat.md)
- [Sincronizar `composer.lock` tras quitar Spatie](runbook/sincronizar-composer-lock.md)
- [BD MySQL con disco lleno](runbook/bd-llena.md)
- [Crash de php-fpm](runbook/php-fpm-crash.md)
- [Restaurar backup MySQL](runbook/restaurar-backup-mysql.md)
- [Backup MySQL automatizado — diseño](runbook/backup-mysql-automatizado.md)
- [Setup del cron del Laravel Scheduler en Hostinger](runbook/setup-cron-scheduler.md)
- [Integrar Sentry (error reporting)](runbook/integrar-sentry.md)
- [Configurar MAIL con Hostinger Email](runbook/setup-mail-hostinger.md)
- [Migrar uploads de filesystem a S3/B2](runbook/migrar-uploads-a-s3-b2.md)
- [Reemplazar polling con Reverb (tiempo real)](runbook/integrar-reverb.md)
- [Arrancar y desplegar la app móvil](runbook/arrancar-app-movil.md) — dev, EAS, TestFlight, OTA
- [**Configurar Stripe** — productos, precios, webhook, portal](runbook/configurar-stripe.md)
- [**Cambiar precio de un plan** — procedimiento ops](runbook/cambiar-precio-plan.md)
- [**Recuperar uploads borrados** por deploy](runbook/recuperar-uploads-perdidos.md)
- [Postmortems — índice + template](runbook/postmortems/README.md)
- [Drills — índice + template](runbook/drills/README.md)
- [Cierre sesión 2026-06-23](runbook/cierre-sesion-2026-06-23.md) — app móvil v1.1→v1.3 + super admin + features/api

### Security
- [Overview](security/README.md)
- [Threat model](security/threat-model.md)
- [Inventario de datos personales (PII)](security/data-inventory.md)
- [Incident response](security/incident-response.md)
- [Security checklist pre-deploy](security/security-checklist.md)
- [SEV-11 — Mobile device token reassignment](security/sev-11-mobile-device-token-reassignment.md) — fix del registro de push móvil

### Guías para owners (no técnicas)
- [Overview](user-guides/README.md)
- [Primeros pasos](user-guides/primeros-pasos.md)
- [Gestionar el menú](user-guides/gestionar-menu.md)
- [Recibir pedidos](user-guides/recibir-pedidos.md)
- [Inventario](user-guides/inventario.md)
- [Métricas](user-guides/metricas.md)

### Referencia
- [Glosario](glossary.md)
- [Credenciales demo](credenciales-demo.md)

---

## Cómo mantener esta documentación

1. **Una idea = un archivo.** Si un `.md` empieza a cubrir dos temas, divídelo.
2. **Linkear el nuevo archivo desde este índice** y desde los archivos relacionados.
3. **Fechar verificaciones** cuando se confirme que el contenido sigue alineado con el código.
4. **Issues / pendientes** van a `issues/`, no contaminan los docs descriptivos.
5. **Decisiones grandes** se escriben como ADR (`decisions/ADR-XXX-titulo.md`) — no se entierran en otros docs.
