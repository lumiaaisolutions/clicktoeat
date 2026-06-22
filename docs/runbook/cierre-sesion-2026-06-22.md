# Cierre de sesión — 2026-06-22

Sesión que **cierra sustancialmente la auditoría integral 2026-06-19**.
Cerramos SEV-12 + SEV-18 completos + dejamos spec ejecutable para SEV-2
(el único hallazgo crítico restante).

## Commits del 2026-06-22

```
(pendiente este commit final — incluirá los docs de cierre + SEV-18 último 30%)
a5a89d9  docs: SEV-12 cerrado completo (17/18 hallazgos del audit)
c5f64ee  docs(api): marcar inline auth en Billing/Upload/Push (SEV-12 — 13/13 ✅)
0af3489  docs(api): marcar inline auth como intencional en 5 controllers (SEV-12 — 9/13)
b9c1fd3  security(api): authorize en ReviewController admin (SEV-12 — 4/13)
8624ee4  security(api): authorize en HorarioController + LocalController.update (SEV-12 — 3/13)
b47dea6  security(api): autorización explícita en CuponController (SEV-12 — 1/13)
```

7 commits en el día. **Todos en local — pendiente `git push origin main`**
(falló por credenciales del macOS keychain en mi sesión).

## Bloques de trabajo

### 1. SEV-12 cerrado completo (`b47dea6` → `c5f64ee` + `a5a89d9`)

Los 13 controllers que el audit flageó sin `$this->authorize()` están ahora
cubiertos. Breakdown:

**4 controllers con Policy nueva explícita**:
- `CuponController` → `CuponPolicy` + `CuponAuthorizationTest` con 7 casos
  cross-tenant.
- `HorarioController` (show + update) → reusa `LocalPolicy`.
- `LocalController::update` → reusa `LocalPolicy` (show ya tenía authorize).
- `ReviewController` admin methods → `ReviewPolicy`.

**9 controllers con inline auth verificada y documentada como intencional**:
- `CancellationFeedbackController` — `abort(403)` inline (no es CRUD).
- `MetricasController` — `abort_unless($user && $local_id)`.
- `AuditLogController` — `throw 403` con lógica específica owner vs super_admin.
- `SearchController` — `$tenant->localIdOrFail()`.
- `ReferidoController` — `if (! $local) return 403`.
- `UploadController` — `StoreImageRequest::authorize()` via FormRequest
  (patrón canónico Laravel).
- `PushSubscriptionController` — inline 401 + filter por user_id (flag
  para hardening futuro similar SEV-11).
- `BillingController` — `TenantContext` + inline 403 en cada endpoint
  protegido.
- `MobileDeviceController` — already authorized via FormRequest +
  SEV-11 fix del 2026-06-19.

**Phpunit**: subió de **219 → 226 verde**.

### 2. SEV-18 cerrado completo (commit este)

Cierra el último 30% que quedaba:

- `.github/workflows/sbom.yml` — genera SBOM CycloneDX JSON para
  composer (apps/api), npm (apps/web), npm (apps/mobile). Triggers:
  push de tags v*, manual, cron semanal lunes 03:00 UTC. Retención
  90 días.
- `.pre-commit-config.yaml` — gitleaks v8.21.2 (pinned) + hooks de
  higiene (merge conflicts, large files, JSON/YAML syntax).
- `docs/runbook/setup-pre-commit-hooks.md` — runbook con `brew install
  pre-commit` + `pre-commit install` + qué cataría + bypass intencional.

### 3. SEV-2 con plan ejecutable (no implementado)

`docs/decisions/ADR-010-token-localStorage-to-httponly-cookie.md` con
spec completo de la migración:

- Diseño técnico: middleware `CookieToBearer` + cookie HttpOnly+Secure+
  SameSite=Lax + cambios en `AuthController::login/logout` + frontend
  `lib/api.ts` con `withCredentials: true` + zero cambios en mobile.
- Plan de despliegue en 4 fases (5-7 días):
  - Día 1: backend cookie setting (backward compat).
  - Día 2-3: frontend + staging tests.
  - Día 4: deploy prod + ventana de re-login.
  - Día 6-7: CSP estricta blocking (Fase 4 — el verdadero objetivo).
- Trade-offs y alternativas documentadas (BFF pattern, PASETO).

**Por qué no se ejecutó esta sesión**: requiere sprint dedicado con
testing en staging + ventana donde users actuales hacen re-login.
Riesgo alto si se mezcla con otros cambios.

## Estado del audit consolidado

| Métrica | Valor |
|---|---|
| Hallazgos cerrados en código | **17 / 18 (94%)** |
| Hallazgos con plan ejecutable | **1 (SEV-2 vía ADR-010)** |
| Hallazgos sin plan | **0** |
| Tests phpunit | **226 verde** (subió de 219) |
| Commits hoy | **7** (pendientes push) |
| Docs nuevos | 4 (cierre + ADR-010 + runbook hooks + SBOM workflow) |

## Estado de producción

**Sin cambios desde 2026-06-20.**

API en prod tiene SEV-1, 3, 4, 5, 10, 11, 13, 15, 16, 17 live. Después
del próximo deploy de API tendrá SEV-6, SEV-12, SEV-18 también live.
Web en prod sigue con bundle Jun 18 (rollback NPROC). Web pendiente
acciones manuales del owner.

## Lo que falta para tu próxima sesión

### Inmediato (tuyo)
1. `git push origin main` — push de los 7 commits del día.
2. Aplicar las 5 acciones manuales del audit (lleva 4 días pendientes):
   - Passengerfile.json env vars (3 min)
   - `./scripts/deploy-web.sh` (10 min)
   - Smoke navegador (5 min)
   - Google Maps key restriction (5 min)
   - 🚨 Borrar API token Hostinger (5 seg)
3. Opcional: `./scripts/deploy-api.sh` para llevar SEV-12 + SEV-18 a prod.

### Futuras sesiones (yo, autónomo)
4. **Ejecutar ADR-010 — SEV-2 migración cookie HttpOnly** (sprint
   dedicado, 5-7 días). Es el último crítico abierto.
5. **WAF + CDN Cloudflare** (2-3 días, decisión plan CF tuya).
6. **Turnstile invisible login** (4h tras tener keys CF).

## Cierre formal del audit

La auditoría integral del 2026-06-19 entró en estado **"sustancialmente
cerrada"**. 17 de 18 hallazgos resueltos en código, 1 con plan
ejecutable. El último (SEV-2) es el que requiere sprint dedicado por
ser un refactor cross-stack (backend + frontend) con migración de
sesiones activas.

Recomendación para retomar: cuando vuelvas, lee este cierre + el
ADR-010 antes de empezar SEV-2.
