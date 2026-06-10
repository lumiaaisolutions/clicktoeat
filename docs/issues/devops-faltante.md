# Issues — DevOps / Infra faltante

> Snapshot al 2026-06-10. Marcador: ✅ = cerrado · 🟡 = parcial (script/diseño listo, falta deploy) · ❌ = abierto

## Pendientes del equipo (de `datos-deploy.md`)

Lista entregada por quien hizo el deploy productivo:

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 1 | Backup automático de MySQL (crontab + mysqldump → externo) | 🟡 | Script production-ready en [`scripts/backup-mysql.sh`](../../scripts/backup-mysql.sh). Falta: setup B2 + cron hPanel. Procedimiento en [`scripts/README.md`](../../scripts/README.md). |
| 2 | Monitoreo externo (UptimeRobot a health check) | ❌ | URL correcta es `/up` (no `/api/v1/health`). Especificación en [`infra/deploy-hostinger.md`](../infra/deploy-hostinger.md#monitoreo-externo-recomendado-uptimerobot-u-otro). |
| 3 | Automatizar deploy (eliminar SCP manual) | 🟡 | Scripts listos: [`deploy-api.sh`](../../scripts/deploy-api.sh) + [`deploy-web.sh`](../../scripts/deploy-web.sh). Falta: integrar a CI (Fase 5). |
| 4 | CDN / almacenamiento externo para uploads (B2/S3) | ❌ | Documentado en [`ADR-006`](../decisions/ADR-006-uploads-locales-interim.md). Sin urgencia hoy (uploads = 3 MB), crítico al escalar. |

## CI/CD

- ❌ No hay `.github/workflows/` ni equivalente.
- ❌ Sin lint/typecheck automatizado.
- ❌ Sin test runner en pull requests.

**Acción mínima:**
```yaml
# .github/workflows/ci.yml
- run: cd apps/api && composer install --no-interaction
- run: cd apps/api && vendor/bin/pint --test
- run: cd apps/api && vendor/bin/phpunit
- run: cd apps/web && npm ci
- run: cd apps/web && npm run lint
- run: cd apps/web && npm run typecheck
```

## Docker producción

### Backend
- Dockerfile actual sirve para dev. En prod necesita:
  - **Multi-stage**: builder con composer dev deps, runtime sólo prod.
  - `composer install --no-dev --optimize-autoloader`.
  - `php artisan config:cache && route:cache && view:cache`.
  - Healthcheck (`HEALTHCHECK CMD curl -f http://localhost/up || exit 1`).
  - Non-root user (ya está parcialmente — `USER www`).
  - Sin código fuente innecesario (`tests/`, `node_modules`, etc.).

### Frontend
- **No hay Dockerfile productivo.** El compose corre `npm install && npm run dev`.
- Para prod:
  - Multi-stage con `next build`.
  - Imagen final corre `next start` o `node server.js`.
  - O usar Vercel/Netlify y olvidarse del Dockerfile.

### nginx
- Falta config para serv estáticos del Next prod si se sirve detrás del mismo nginx.
- Falta TLS termination (asume reverse proxy externo).
- Falta HSTS.
- Falta CSP.

## Healthchecks

- ✅ `mysql` tiene `mysqladmin ping`.
- ❌ `api` — no chequea PHP-FPM.
- ❌ `nginx` — no chequea respuesta.
- ❌ `web` — no chequea Next.

## Secretos

- Compose hardcodea `MYSQL_ROOT_PASSWORD=root`, `MYSQL_USER=clickeat`, `MYSQL_PASSWORD=clickeat`.
- `APP_KEY` committed en `apps/api/.env`.

**Acción:**
- En prod: secret manager (Doppler, Vault, GitHub Actions Secrets).
- En dev: aceptable bajo asunción de "no exponer puertos al internet".

## Backups

- ❌ No hay estrategia documentada.

**Acción mínima:** `mysqldump --single-transaction` diario, retención 30 días, off-site.

## Logs

- ✅ Laravel → `storage/logs/laravel.log` + `php.log`.
- ❌ Sin centralización (Loki, Datadog, CloudWatch).
- ❌ Sin rotación automática.
- ❌ Sin formato estructurado (JSON).

## Monitoreo

- ❌ Sin **uptime monitor** externo (UptimeRobot, Pingdom, BetterStack).
- ❌ Sin **error reporting** (Sentry, Bugsnag).
- ❌ Sin **metrics** (Prometheus, OTEL).
- ❌ Sin **distributed tracing**.
- ❌ Sin **dashboards** (Grafana).

## Performance

- ❌ Sin **opcache stats** en prod (sí está habilitado en `php.ini`).
- ❌ Sin **slow query log** de MySQL.
- ❌ Sin **APM** (Inspector, New Relic).
- ❌ Sin **frontend Web Vitals** capturados.

## Storage de uploads

- Dev: bind mount al filesystem local del host.
- Prod: indefinido. Si el contenedor api se reescala horizontalmente, las uploads en uno no se ven en otro.
- **Acción:** S3 + Filesystem disk `s3` en Laravel, **o** Cloudinary, **o** volumen NFS compartido.

## Cron / scheduled tasks

- ❌ Sin `php artisan schedule:run` en cron.
- Hoy: no hay tareas programadas (`app/Console/Kernel.php` no agenda nada).
- Si se introducen (limpieza de tokens viejos, cierre de pedidos viejos, etc.) hace falta el cron host.

## Queue workers

- `QUEUE_CONNECTION=database`.
- Sin Jobs definidos, sin `supervisor` corriendo `queue:work`.
- Si se introducen Jobs (envío de email, regeneración de OG, etc.) hay que añadir `supervisor` o algo equivalente al stack.

## Versionado / releases

- Sin **CHANGELOG**.
- Sin **tags semver**.
- Sin **release notes**.

## Documentación de runbook

- Sin guía "qué hacer si X falla" para:
  - BD se llena.
  - Crash de PHP-FPM.
  - Token cache corrupto.
  - Sentry / monitoreo paginan.
  - Restore desde backup.
  - Rotación de `APP_KEY`.

## Factories de Laravel

- `database/factories/` no existe.
- Los tests usan `Model::create([...])` literal.
- **Acción:** crear factories para cada modelo — facilita escribir tests futuros.
