# Security checklist pre-deploy

> Lista de verificación antes de cada deploy productivo. Si **cualquiera** queda en ❌, no se hace deploy hasta resolver.

## Configuración del entorno

- [ ] `APP_ENV=production` en `.env` productivo.
- [ ] `APP_DEBUG=false` en `.env` productivo.
- [ ] `APP_KEY` única para producción (no copiada de dev).
- [ ] `APP_URL` apunta al dominio real con HTTPS (`https://clicktoeat-api.lumiaaisolutions.com`).
- [ ] `FRONTEND_URL` correcto para CORS (`https://clicktoeat.lumiaaisolutions.com`).
- [ ] `LOG_LEVEL=warning` (no `debug`).
- [ ] `L5_SWAGGER_GENERATE_ALWAYS=false` (no regenerar en cada request).
- [ ] `MAIL_*` configurado (cuando exista feature que use email).
- [ ] Credenciales en secret manager / .env del servidor — **nunca** commiteadas.

## Secretos

- [ ] `git ls-files | grep -E "^\.env$|^apps/.+/\.env$"` devuelve **vacío**.
- [ ] `apps/api/.env` (productivo, en el servidor) tiene permisos `600` y propiedad correcta.
- [ ] APP_KEY rotada en los últimos 12 meses (registro: `docs/runbook/rotar-app-key.md`).
- [ ] Credenciales de B2 con permisos mínimos (`writeFiles` para el server productivo).
- [ ] Tokens de servicios externos (Slack webhook, Healthchecks UUID) en `.env`, no en el repo.

## Headers HTTP

Validar con `curl -I https://clicktoeat-api.lumiaaisolutions.com/api/v1/public/locales`:

- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS — **pendiente** añadir a nginx).
- [x] `X-Frame-Options: SAMEORIGIN` (ya en `docker/nginx/default.conf`).
- [x] `X-Content-Type-Options: nosniff` (ya).
- [x] `Referrer-Policy: strict-origin-when-cross-origin` (ya).
- [ ] `Content-Security-Policy: ...` (**pendiente** definir política).
- [ ] `Permissions-Policy: geolocation=(self)` (limita APIs del navegador).
- [ ] `Server` header **no** revela versión exacta de nginx/Laravel (usar `server_tokens off` en nginx).

## CORS

- [ ] `apps/api/config/cors.php` → `allowed_origins` = sólo `FRONTEND_URL`, no `*`.
- [ ] `supports_credentials: true` sólo si se usa modo SPA-stateful (no es el caso hoy — bearer tokens).
- [ ] OPTIONS preflight responde con headers correctos.

## TLS / HTTPS

- [ ] Certificado válido para ambos subdominios.
- [ ] Renovación automática (Let's Encrypt + cron, o Hostinger panel).
- [ ] Redirect 80 → 443 forzado.
- [ ] Test en <https://www.ssllabs.com/ssltest/> — grado A o mejor.
- [ ] Si Cloudflare en frente: modo SSL `Full (strict)`, origen también con cert válido.

## Auth y sesiones

- [ ] Sanctum tokens tienen `expires_at` configurado (**pendiente** — hoy NULL).
- [ ] Bcrypt cost ≥ 12 (`config/hashing.php` o variable).
- [ ] Rate limit en `/auth/login` activo (verificar con 11 requests seguidos).
- [ ] Password mínimo 8 chars con letras + números (validado por `RegisterRequest`).
- [ ] Reset password requiere identificación (sólo super_admin puede resetear owners — confirmado).

## Multi-tenancy

- [ ] `TenantContext` registrado como **singleton** en `AppServiceProvider`.
- [ ] Todos los modelos con `local_id` usan trait `BelongsToTenant` (`grep -L "BelongsToTenant" apps/api/app/Models/*.php` valida).
- [ ] Test de isolation actualizado (un local no ve datos de otro).
- [ ] Búsqueda `grep -rn "withoutGlobalScopes\|withoutTenantScope\|DB::table" apps/api/app` revisada — cada uso justificado.

## Endpoints públicos

- [ ] `POST /public/pedidos/{slug}` valida que `producto_id` pertenece al local.
- [ ] `POST /public/pedidos/{slug}` valida que `extras` del payload coinciden con catálogo del producto (**pendiente** — vector #8 del threat-model).
- [ ] Throttle 20/min activo y no fácilmente evadible.
- [ ] `GET /public/menu/{slug}` no expone campos sensibles (precios privados, costos, etc.).

## Uploads

- [ ] `StoreImageRequest` valida mimetype + extensión + tamaño.
- [ ] nginx **no** ejecuta PHP en `/storage/...` (validar config).
- [ ] `Storage::disk('public')` apunta al directorio correcto.
- [ ] Permisos de `storage/app/public/` son `755` no `777`.

## Base de datos

- [ ] Usuario MySQL de la app **no** tiene `GRANT ALL` — sólo SELECT/INSERT/UPDATE/DELETE/EXECUTE en la BD productiva.
- [ ] Conexión a MySQL desde la app va por `localhost`/socket (no expuesta al internet).
- [ ] Puerto 3306 cerrado en firewall del servidor a IPs externas.
- [ ] Backups corriendo (verificar logs `/var/log/clicktoeat/backup.log` del último día).
- [ ] Último restore drill exitoso < 30 días.

## Logs

- [ ] Logs con rotación (`LOG_CHANNEL=daily` o equivalente).
- [ ] Logs no contienen `Authorization` headers o tokens (`grep -i "bearer\|token" storage/logs/*.log` revisado).
- [ ] Logs no contienen passwords (esto ya está protegido por Laravel — pero validar).
- [ ] Logs sólo accesibles para devs con SSH al servidor.

## Frontend

- [ ] `NEXT_PUBLIC_API_URL` apunta a `https://` (no `http://`) en `.env.production`.
- [ ] No hay tokens / secretos en el bundle JS (`grep -r "Bearer\|api_key\|secret" apps/web/.next/static/` debe estar vacío).
- [ ] localStorage del frontend no almacena PII del cliente (sólo el cart y la auth — validado).
- [ ] `next.config.mjs` → `poweredByHeader: false` (no anunciar Next.js).

## Pruebas de seguridad

- [ ] Suite PHPUnit pasa (incluye tests de isolation multi-tenant).
- [ ] Smoke test: `/up` responde 200.
- [ ] Smoke test: login con credenciales válidas funciona.
- [ ] Smoke test: login con credenciales inválidas devuelve 422.
- [ ] Test manual: `GET /api/v1/_ignition` debe responder 404 (no debe exponer Ignition en prod).
- [ ] Test manual: pedir endpoint protegido sin token devuelve 401.
- [ ] Test manual: pedir endpoint de otro local como owner devuelve 403/404.

## Monitoreo

- [ ] UptimeRobot (o equivalente) configurado para frontend + `/up` de la API.
- [ ] Alertas Slack en caída ≥ 2 min.
- [ ] Logs de aplicación llegan a un destino monitoreable (filesystem mínimo; idealmente Sentry/Loki).
- [ ] Dead-man switch del backup activo (Healthchecks.io).

## Documentación al día

- [ ] `docs/database/schema.md` refleja el schema actual.
- [ ] `docs/api/*.md` lista los endpoints actuales.
- [ ] `docs/security/data-inventory.md` actualizado si se introdujeron nuevos campos PII.
- [ ] `docs/security/threat-model.md` actualizado tras cualquier vector nuevo descubierto.
- [ ] `CHANGELOG.md` actualizado con la versión que se va a desplegar.

## Post-deploy

- [ ] Verificación humana en navegador: landing pública carga + se puede crear pedido test.
- [ ] Verificación humana: panel admin login funciona.
- [ ] Monitoreo de errores (Sentry) sin spike post-deploy.
- [ ] Logs sin errores nuevos en las próximas 24h.

---

## Cómo usar este checklist

1. Copiarlo a un PR como template antes de cada deploy.
2. Marcar cada item antes de pushar.
3. Si algo no está, abrirlo como issue y bloquear el deploy.
4. Revisar la versión del checklist cada release menor — añadir items según se aprenda de incidentes.
