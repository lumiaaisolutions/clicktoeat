# Cierre de sesión — 2026-06-19

Sesión dedicada a **auditoría integral de ciberseguridad** del sistema entero
(API + Web + Infra + Mobile + Multi-tenancy). Resumen del día.

## Commits del 2026-06-19

```
abe0a07  docs+ops: documentación auditoría 2026-06-19 + script rollback-web
5d2cdc5  fix(web): defer sileo import to prevent SSR crash en Passenger standalone
08e41a2  security+feat: hardening auditoría (SEV-1..15) + app móvil push notifications
```

3 commits. Los dos primeros (`08e41a2`, `5d2cdc5`) ya pusheados a GitHub.
`abe0a07` pendiente de push.

## Bloques de trabajo

### 1. Auditoría integral con la skill `ciberseguridad-auditor-integral`

Cubrimos OWASP Web/API Top 10, ASVS, NIST SSDF/CSF, defensa en profundidad
y arquitectura zero-trust sobre todo el sistema.

**Resultado**: 18 hallazgos clasificados (4 críticos, 6 altos, 4 medios,
3 bajos, 1 info). Reporte completo en
[`docs/security/auditoria-integral-2026-06-19.md`](../security/auditoria-integral-2026-06-19.md).

#### Bloque rojo aplicado (críticos, ≤24h)

| SEV | Qué | Archivo |
|---|---|---|
| 1 | Sanctum expira a 7 días (antes eternos) | `apps/api/config/sanctum.php` |
| 3 | SSRF en webhooks salientes — nueva `App\Rules\SafePublicUrl` | `apps/api/app/Rules/SafePublicUrl.php` + `OutgoingWebhookController.php` |
| 4 | Security headers (HSTS, X-Frame, X-Content, Referrer, Permissions, CSP Report-Only) | `apps/api/public/.htaccess` + `apps/web/next.config.mjs` |
| 9 | Sentry mask + scrub PII en los 3 runtimes | `apps/web/sentry.{client,server,edge}.config.ts` |
| 14 | Next.js 14.2.15 → 14.2.35 (CVE-2025-29927 + CVE-2025-32421) | `apps/web/package.json` |
| 15 | Log de upload 422 sin `all_keys` | `apps/api/app/Http/Requests/Upload/StoreImageRequest.php` |

#### Bloque naranja aplicado (altos, ≤semana)

| SEV | Qué | Archivo |
|---|---|---|
| 5 | CORS explícito (sin wildcards) | `apps/api/config/cors.php` |
| 7 | Email preview en `<iframe sandbox>` + DOMPurify | `apps/web/src/app/admin/email-templates/page.tsx` |
| 10 | Rate limit login en 3 capas (email/IP/global) + Retry-After | `apps/api/app/Http/Controllers/Api/AuthController.php` |
| 11 | MobileDevice rechaza cross-user token reassignment (409) | `apps/api/app/Http/Controllers/Api/MobileDeviceController.php` + test + mobile push.ts |
| 13 | docker-compose MySQL bind 127.0.0.1 | `docker-compose.yml` |
| 17 | backup-mysql.sh usa `MYSQL_PWD` env (no en `ps`) | `scripts/backup-mysql.sh` |

#### Bonus — toast con Sileo

Integramos `sileo@0.1.5` como motor de toasts con físicas. Cero breaking
changes: `@/store/toast` es ahora adapter sobre `sileo.*`, los ~20 archivos
que importan `toast.success/error/info` siguen sin tocar.

Decisión: lazy `next/dynamic({ssr:false})` + `await import('sileo')` en handlers.
Ver [`docs/decisions/ADR-009-sileo-toaster-lazy-import.md`](../decisions/ADR-009-sileo-toaster-lazy-import.md).

**Bonus inesperado**: First Load JS shared de admin baja de **226 kB → 179 kB**
(~50 kB ahorro) — sileo + motion ahora en chunk client-only.

### 2. Feature App móvil completada

El feature pre-existente del usuario (`apps/mobile/` con Expo SDK 56,
NativeWind, secure token storage) quedó integrado:
- Backend: `MobileDeviceController` + model + migración + `ExpoPushSender` +
  `PushDispatcher` + `RegisterMobileDeviceRequest`
- Rutas: `POST /mobile/register-device` y `POST /mobile/unregister-device`
- Auditoría incluyó SEV-11 (cross-user reject) y el mobile push.ts ahora
  maneja 409 gracefully

### 3. Outage del frontend post-deploy 21:20 → 21:38 MX

`deploy-web.sh` con el bundle nuevo devolvió **HTTP 503** al health check.
Rollback aplicado a mano (`mv .next.previous .next` + swap de `public`) y
servicio restablecido en ~18 min.

**Causa real diagnosticada**: límite NPROC de CloudLinux LVE en Hostinger
(`pthread_create: Resource temporarily unavailable` + `uv_thread_create`
assertion failed). NO era sileo (mi diagnóstico inicial sin log fue
incorrecto — lección de la sesión: nunca diagnosticar a ciegas).

Post-mortem completo en
[`docs/issues/2026-06-19-outage-frontend-nproc.md`](../issues/2026-06-19-outage-frontend-nproc.md).

### 4. Documentación + ops

Creamos 5 archivos en `docs/` y 1 script ops en `scripts/`:

| Archivo | Para qué |
|---|---|
| `docs/security/auditoria-integral-2026-06-19.md` | Reporte completo + estado por SEV + roadmap restante |
| `docs/runbook/rollback-frontend.md` | Procedimiento de rollback (auto + manual + hPanel) + gotchas conocidos |
| `docs/issues/2026-06-19-outage-frontend-nproc.md` | Post-mortem del 503 + timeline + lecciones |
| `docs/infra/passenger-node-tuning.md` | Tuning `UV_THREADPOOL_SIZE`, `--max-old-space-size`, telemetría |
| `docs/decisions/ADR-009-sileo-toaster-lazy-import.md` | ADR del patrón dynamic + lazy de sileo |
| `scripts/rollback-web.sh` | Rollback en un comando, CageFS-friendly (heredoc) |

## Tests y verificación

- **Backend**: `vendor/bin/phpunit` → **218/218 verde** (subió desde 194/194 del cierre anterior con el test nuevo de SafePublicUrl + MobileDevice actualizado).
- **Frontend**: `npm run typecheck` ✓, `npm run build` ✓.
- **Mobile**: typecheck implícito (no tiene suite de tests todavía).

## Estado actual de producción

| Capa | URL | Versión | Estado |
|---|---|---|---|
| **API Laravel** | https://clicktoeat-api.lumiaaisolutions.com | `08e41a2` con audit completo | 🟢 Live |
| **Web Next.js** | https://clicktoeat.lumiaaisolutions.com | Bundle Jun 18 (pre-audit, rollback) | 🟢 Live pero sin hardening del audit |
| **Web local** | — | `5d2cdc5` con fix sileo lazy | ✅ Build OK, pendiente re-deploy |

### Headers de seguridad verificados en prod (API)

```
strict-transport-security: max-age=63072000; includeSubDomains; preload   ✅
x-content-type-options: nosniff                                            ✅
x-frame-options: DENY                                                      ✅
referrer-policy: strict-origin-when-cross-origin                           ✅
permissions-policy: camera=(), microphone=(), geolocation=(), ...         ✅
server: hcdn                            (banner LiteSpeed suprimido)      ✅
(no x-powered-by)                                                          ✅
```

### Rate limit nuevo verificable en prod

```bash
# 6 logins fallidos seguidos → 5 dan 422 y el sexto 429 con Retry-After
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code} " \
    https://clicktoeat-api.lumiaaisolutions.com/api/v1/auth/login \
    -X POST -H "Content-Type: application/json" \
    -d '{"email":"noexist@test.com","password":"bad"}'
done
```

## Lecciones de la sesión

1. **Nunca diagnosticar sin log**. Las hipótesis de "lo más probable" sin
   evidencia pueden enviar a un re-deploy del mismo bug. Mejor esperar
   15-30 min y leer.

2. **Hostinger CageFS rechaza inline SSH largos** (`exec request failed on
   channel 0`). Usar `bash -s` con heredoc.

3. **Hostinger fail2ban se dispara con ~3-5 intentos fallidos** y extiende
   con reintentos. Si SSH empieza a fallar, parar 30-60 min y usar hPanel.

4. **Node sobre Passenger en CloudLinux es threads-hungry**. Cualquier bump
   de dependencias o de bundle puede empujar al límite NPROC. Aplicar
   `UV_THREADPOOL_SIZE=2` proactivo + monitorear vía `/proc/<pid>/status`.

5. **Sileo es 0.1.x single-maintainer** — usar siempre con `dynamic({ssr:false})`
   y vía adapter, no import directo. Si rompe, switch a `sonner` es 30 min.

## Siguiente sesión

Ver [`docs/CONTINUAR.md`](../CONTINUAR.md) y [`docs/PENDIENTES.md`](../PENDIENTES.md).

Foco recomendado:
1. Aplicar env vars de Capa 1 en hPanel + re-deploy web (cierra el outage).
2. Restringir Google Maps key en Google Cloud Console (cierra SEV-8).
3. Empezar bloque amarillo del audit (SEV-12, SEV-6, dependabot).
