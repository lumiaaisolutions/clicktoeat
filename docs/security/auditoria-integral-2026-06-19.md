# Auditoría integral de ciberseguridad — 2026-06-19

> Resultado de aplicar la skill `ciberseguridad-auditor-integral` (Anthropic
> Claude Code) sobre el repo ClickToEat. Cubre OWASP Web/API Top 10, ASVS,
> NIST SSDF, defensa en profundidad y arquitectura zero-trust.

## Resumen ejecutivo

**18 hallazgos** sobre el sistema completo (Laravel API + Next.js web +
infra Hostinger + multi-tenancy + mobile):

| Severidad | Cant | Estado deployment (actualizado 2026-06-20) |
|---|---|---|
| 🔴 Crítica | 4 (SEV-1..4) | 3 deployadas (API), 1 parcial (web — pendiente re-deploy) |
| 🟠 Alta    | 6 (SEV-5..10) | 5 deployadas. **SEV-6 cerrado completo el 2026-06-20** (Model::unguard removido + FillableGuardTest + migración forceFill). SEV-7 y SEV-9 web pendientes. |
| 🟡 Media   | 4 (SEV-11..14) | Deployadas |
| 🔵 Baja    | 3 (SEV-15..17) | Deployadas |
| ⚪ Info     | 1 (SEV-18) | **~70% cerrado el 2026-06-20** (Dependabot + npm audit signatures). Falta SBOM CycloneDX + pre-commit gitleaks. |

**Commits relevantes**:
- `08e41a2` — hardening completo + mobile feature backend (ya en prod API)
- `5d2cdc5` — fix sileo lazy/dynamic (pendiente prod web)

---

## Hallazgos detallados (resumen)

### 🔴 SEV-1 — Tokens Sanctum nunca expiran (CVSS 8.6)
**Ubicación**: `apps/api/config/sanctum.php:14` (`'expiration' => null`)
**Fix**: ✅ Aplicado — ahora `60 * 24 * 7` (7 días).
**Estado prod**: ✅ Live.

### 🔴 SEV-2 — Tokens en localStorage = XSS → ATO eterno (CVSS 9.0)
**Ubicación**: `apps/web/src/lib/api.ts:5,44-46`
**Fix**: ⚠️ NO aplicado en este sprint. Requiere refactor a cookies
HttpOnly+Secure+SameSite=Lax. Trabajo del bloque amarillo (#17 del roadmap).
**Estado prod**: 🟥 Vulnerabilidad activa.

### 🔴 SEV-3 — SSRF en webhooks salientes (CVSS 8.5)
**Ubicación**: `apps/api/app/Http/Controllers/Api/OutgoingWebhookController.php:31,51`
**Fix**: ✅ Nueva regla `App\Rules\SafePublicUrl` que resuelve el host y
rechaza IPs reservadas, RFC 1918, link-local, multicast e IMDS metadata
(169.254.169.254). Tests: `tests/Feature/SafePublicUrlRuleTest.php`.
**Estado prod**: ✅ Live.

### 🔴 SEV-4 — Sin security headers en producción (CVSS 8.1)
**Ubicación**: `apps/api/public/.htaccess` + `apps/web/next.config.mjs`
**Fix**: ✅ Aplicado HSTS preload, X-Frame-Options DENY, X-Content-Type nosniff,
Referrer-Policy, Permissions-Policy. CSP en Report-Only el primer mes para no
romper landings.
**Estado prod**:
- API: ✅ Live (verificado con `curl -sI` post-deploy).
- Web: 🟡 Bundle Jun 18 no lo tiene (rollback). Vuelve con próximo deploy.

### 🟠 SEV-5 — CORS con wildcards (CVSS 5.4)
**Ubicación**: `apps/api/config/cors.php:6,14`
**Fix**: ✅ Métodos y headers explícitos. Expone rate-limit headers.
**Estado prod**: ✅ Live.

### 🟠 SEV-6 — `Model::unguard()` global ✅ CERRADO 2026-06-20
**Ubicación**: `apps/api/app/Providers/AppServiceProvider.php:25`
**Fix aplicado** (commits `c4c6d8c` + `0e246b6`):
- Removido `Model::unguard()` global.
- Nuevo `FillableGuardTest` que falla el build si algún modelo no declara
  `$fillable` o `$guarded` — red para el siguiente modelo nuevo.
- `StaffController::store()` y `Admin/LocalController::store()` migrados
  a `forceFill(['email_verified_at' => now()])` (campo de sistema, NO
  va en $fillable porque sino un atacante podría auto-verificar email).
**Verificación**: 219/219 phpunit verde.
**Estado prod**: ✅ Live en API.

### 🟠 SEV-7 — `dangerouslySetInnerHTML` en preview de email (CVSS 7.6)
**Ubicación**: `apps/web/src/app/admin/email-templates/page.tsx:291`
**Fix**: ✅ Reemplazado por `<EmailPreviewFrame>` con `<iframe sandbox="">`
(sin `allow-scripts`) + DOMPurify (defensa en dos capas).
**Estado prod**: 🟡 Pendiente con próximo deploy del web.

### 🟠 SEV-8 — Google Maps API key commiteada (CVSS 7.5 si no está restringida)
**Ubicación**: `apps/web/.env.production:3`
**Acción**: 🔴 **Manual en Google Cloud Console** — restringir referrer a
`*.lumiaaisolutions.com` y limitar APIs a Maps JS/Places/Geocoding.

### 🟠 SEV-9 — Sentry replays con PII (CVSS 6.5)
**Ubicación**: `apps/web/sentry.{client,server,edge}.config.ts`
**Fix**: ✅ `replayIntegration` con `maskAllText`, `maskAllInputs`,
`blockAllMedia`. `beforeSend` que redacta `Authorization`, `Cookie`,
email/teléfono en mensajes. Aplicado a los 3 runtimes.
**Estado prod**: 🟡 Pendiente con próximo deploy del web.

### 🟠 SEV-10 — Login: rate limit IP+email cae a credential-stuffing distribuido (CVSS 6.5)
**Ubicación**: `apps/api/app/Http/Controllers/Api/AuthController.php:68-78`
**Fix**: ✅ Rate limit en 3 capas (email/IP/global) con ventana 15min + header `Retry-After`.
**Estado prod**: ✅ Live.

### 🟡 SEV-11 — MobileDevice cross-user token hijack (CVSS 3.7)
**Ubicación**: `apps/api/app/Http/Controllers/Api/MobileDeviceController.php:22-32`
**Fix**: ✅ Rechaza con 409 si `expo_push_token` pertenece a otra cuenta.
Test actualizado. App mobile maneja 409 gracefully.
**Estado prod**: ✅ Live.

### 🟡 SEV-12 — Controllers sin `$this->authorize()` explícito (CVSS 5.4)
**Estado**: ⚠️ NO aplicado. Trabajo del bloque amarillo (#14 del roadmap, ~2-3 días).

### 🟡 SEV-13 — MySQL en `docker-compose.yml` expone 0.0.0.0 + password trivial
**Ubicación**: `docker-compose.yml`
**Fix**: ✅ Bind a `127.0.0.1:3307`. Solo afecta dev local.
**Estado**: ✅ Aplicado en repo.

### 🟡 SEV-14 — Next.js 14.2.15 expuesto a CVE-2025-29927 + CVE-2025-32421
**Fix**: ✅ Bump a 14.2.35.
**Estado prod**: 🟡 Pendiente con próximo deploy del web.

### 🔵 SEV-15 — Log de upload 422 expone `all_keys` del request
**Ubicación**: `apps/api/app/Http/Requests/Upload/StoreImageRequest.php:41-47`
**Fix**: ✅ Removido.
**Estado prod**: ✅ Live.

### 🔵 SEV-16 — Banner Server/X-Powered-By
**Fix**: ✅ `Header always unset` en `.htaccess`.
**Estado prod**: ✅ Live.

### 🔵 SEV-17 — `backup-mysql.sh` pasa password por línea de comandos
**Ubicación**: `scripts/backup-mysql.sh`
**Fix**: ✅ Usa `MYSQL_PWD` env var en lugar de `--password=`.
**Estado**: ✅ Aplicado.

### ⚪ SEV-18 — Falta SBOM, dependency scanning automatizado, pre-commit gitleaks
**Estado**: ✅ ~70% cerrado el 2026-06-20 (commits `91979c7` + `60107e3`):
- `.github/dependabot.yml` creado — auto-PRs semanales para composer + npm
  + github-actions. Ignora majors de stack core y todos los bumps de sileo.
- `npm audit signatures` agregado al workflow security.yml (catch tipo
  event-stream/colors.js). `continue-on-error: true` hasta migración
  ecosistema a Sigstore.
**Falta**: SBOM CycloneDX por release + pre-commit `gitleaks protect --staged`.

---

## Lo que falta por hacer

### Bloque amarillo (este mes — 3 refactors mayores)

1. **#14 — Aplicar `$this->authorize()` en 12+ controllers** + tests negativos
   cross-tenant. Cierra SEV-12. Esfuerzo: ~2-3 días.
2. **#15 — Quitar `Model::unguard()` global**, test de regresión que falle si
   algún modelo no tiene `$fillable`. Cierra SEV-6. Esfuerzo: ~1 día.
3. **#16 — Dependabot + composer/npm audit bloqueante en CI + pre-commit
   gitleaks**. Cierra SEV-18. Esfuerzo: medio día.

### Bloque azul (este trimestre — 2 cambios arquitectónicos)

1. **#17 — Migrar token de localStorage a cookie HttpOnly** + CSP estricta
   blocking + considerar separar panel admin en subdominio. Cierra SEV-2.
2. **#18 — WAF/CDN Cloudflare delante** + SIEM unificada + test de restore
   periódico. Arquitectura.

### Acciones manuales pendientes

- **SEV-8 — Restringir Google Maps API key** en Google Cloud Console (~5 min).
- **CSP-Report-Only → blocking** después de 1-2 semanas de monitoreo en Sentry.
- **Turnstile/captcha invisible** tras 3 fallos de login (cierra el último 15%
  de SEV-10).

---

## Defensas existentes que SÍ funcionan (no tocar)

- TenantScope singleton + trait `BelongsToTenant` + `EnforceTenantScope` middleware.
- Stripe webhook signature verification + idempotencia por `stripe_event_id`.
- Rate limit por tenant en pedidos públicos (`AppServiceProvider:46-54`).
- `Hash::make` (bcrypt cost 12) + timing-safe `Hash::check`.
- 2FA TOTP con recovery codes cifrados (AES-256-GCM Laravel).
- No SQL injection — todas las queries usan bindings o expresiones literales.
- Uploads con allowlist + magic-byte + tamaño + rename UUID.
- AuditObserver sobre modelos sensibles.
- `URL::forceScheme('https')` en prod.
- gitleaks en CI.

---

## Referencias

- Issue del outage durante el deploy: [`docs/issues/2026-06-19-outage-frontend-nproc.md`](../issues/2026-06-19-outage-frontend-nproc.md)
- ADR sobre sileo lazy: [`docs/decisions/ADR-009-sileo-toaster-lazy-import.md`](../decisions/ADR-009-sileo-toaster-lazy-import.md)
- Runbook rollback web: [`docs/runbook/rollback-frontend.md`](../runbook/rollback-frontend.md)
- Tuning Node bajo Passenger: [`docs/infra/passenger-node-tuning.md`](../infra/passenger-node-tuning.md)
