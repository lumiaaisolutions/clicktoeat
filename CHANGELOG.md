# Changelog

Todos los cambios notables del proyecto se documentan acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

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

### Fixed
- _Por venir._

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
