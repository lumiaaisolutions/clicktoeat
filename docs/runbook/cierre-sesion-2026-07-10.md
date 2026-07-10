# Cierre de sesión — 2026-07-10 (2 incidentes de producción del 2026-07-06)

> Cierre documental de la sesión que diagnosticó y resolvió 2 incidentes de
> producción encadenados: locales huérfanos duplicados con suscripción
> Stripe real, y trials vencidos con acceso ilimitado por un cron que nunca
> corrió. Todo el código está desplegado y verificado; esta sesión terminó
> de dejar la documentación consistente con lo que realmente hay en
> producción.

## TL;DR

- **4 commits de código** desplegados en producción (API + web), todos con
  suite verde y health check OK: locales huérfanos + AVIF rechazado +
  validación cruzada plan_id/plan_status + gating de plan en tiempo real.
- **1 commit de documentación** con los 2 postmortems completos.
- **Infraestructura**: los 3 crons de ClickToEat en Hostinger (`schedule:run`,
  `audit-logs:purge`, `locales:purge`) nunca ejecutaron nada — corregidos y
  **verificados corriendo** (`storage/logs/cron.log` creciendo cada minuto).
- **8 docs de features/runbooks existentes actualizados** con el delta de
  cada fix (no se duplicó el contenido de los postmortems en cada uno —
  solo lo que cambió y un link al postmortem para el detalle completo).
- **2 hallazgos documentados y sin resolver**, anotados en `PENDIENTES.md`:
  el mismo bug de cron podría afectar a ClickToDo/ClickToBarber/ClickToShop
  (no revisados, son otros proyectos), y no hay gate server-side genérico
  de "plan activo" para CRUD base (solo frontend + features premium
  específicas).

## Commits del día (2026-07-06, desplegados y verificados)

```
500fdd8  fix(api+web): cierre incidente locales huérfanos + suscripciones Stripe duplicadas
6dd801f  fix(api): AVIF real rechazado al subir logo/banner/onboarding
584de0c  fix(api+web): gating de plan no dependa solo del cron diario
e3d071b  docs: postmortem trial-expiry-not-enforced + corrección de CONTINUAR/PENDIENTES
```

Todos en `main`. Nota: el repo también recibió `f55876b` (2026-07-10,
sesión distinta — port del fix SEV-2 cookie HttpOnly desde ClickToShop +
fix de colores Tailwind) y `2d55731` (2026-07-04) — no relacionados con
este cierre, mencionados solo para que el `git log` no genere confusión.

## Incidente 1 — Locales huérfanos duplicados con suscripción Stripe real

**Reporte original**: un owner veía "Sin suscripción activa" en
`/admin/billing` mientras el super_admin veía su local con plan Profesional
activo en `/admin/locales`. Al intentar "Ver planes" para resolverlo, el
checkout de Stripe lo mandaba de vuelta a "crear cuenta" como si fuera
cliente nuevo — lo intentó 3 veces, creando **3 locales duplicados con 3
suscripciones Stripe reales** cobrando por separado (evitado antes del
primer cobro: 2 canceladas, 1 conservada y vinculada al owner correcto).

**Causa raíz**: el checkout de Stripe (`POST /billing/checkout`) no ataba
ninguna referencia al usuario/local que lo iniciaba. Al volver de Stripe,
el sistema no encontraba coincidencia y creaba un Local nuevo cada vez.
Separado: `Admin/LocalController::updateBilling` permitía guardar
`plan_status` sin exigir `plan_id`, produciendo el mismatch de vista entre
owner y super_admin.

**Fix** (commit `500fdd8`): `client_reference_id` (`local:N`/`user:N`) en
todo checkout que se inicia con sesión activa; `session()` y el webhook lo
usan para vincular en vez de crear huérfanos; validación cruzada en
`updateBilling`; comando `locales:detect-orphan-stripe` como red de
seguridad adicional (cron diario).

**Detalle completo**: [`postmortems/2026-07-06-locales-huerfanos-stripe.md`](postmortems/2026-07-06-locales-huerfanos-stripe.md).

## Incidente 2 — Trials vencidos con acceso ilimitado

**Descubierto** verificando por qué el cron del incidente 1
(`locales:detect-orphan-stripe`) no generaba logs. Resultó que **ningún**
cron de ClickToEat corría en producción — incluido `trials:expire-manual`,
el único mecanismo que cierra un trial manual vencido. Consecuencia: un
local en trial manual (sin Stripe) seguía con acceso completo indefinidamente
sin importar cuántos días de retraso llevara.

**Causa raíz de infraestructura**: el ejecutor de cron de esta cuenta de
Hostinger no pasa los comandos por una shell real. `cd X && comando`
fallaba desde el primer token; sin `cd`, `>>` se pasaba como argumento
literal a Artisan; envuelto en `/bin/sh -c '...'` fallaba por quoting mal
preservado por la capa de API de Hostinger. Tres intentos fallidos antes
de encontrar el patrón que funciona.

**Fix**:
1. `Local::hasActivePlan()` ahora compara `trial_ends_at` en tiempo real
   para `plan_status='trialing'` — el bloqueo deja de depender 100% de que
   el cron haya corrido (commit `584de0c`).
2. Los 3 crons de ClickToEat movidos a scripts `.sh` en `~/cron-scripts/`
   en el servidor — el campo "Comando" del cron es solo la ruta al script,
   sin `&&`/`>>`/comillas anidadas. **Verificado corriendo**:
   `storage/logs/cron.log` con líneas nuevas cada minuto.

**Detalle completo**: [`postmortems/2026-07-06-trial-expiry-not-enforced.md`](postmortems/2026-07-06-trial-expiry-not-enforced.md).

## Verificación en producción

```
php artisan test (local, antes de cada deploy)     → 265 passed
npm run typecheck (local, antes de cada deploy)     → limpio
curl https://clicktoeat-api.lumiaaisolutions.com/up → 200 (tras cada deploy de API)
curl https://clicktoeat.lumiaaisolutions.com/       → 200 (tras deploy de web)
```

Cron corregido, verificado por SSH después de la corrección:
```
cat storage/logs/cron.log
# INFO  No scheduled commands are ready to run.   (repetido, una vez por minuto)
```

## Estado final de la documentación

| Doc | Estado |
|---|---|
| `docs/runbook/postmortems/2026-07-06-locales-huerfanos-stripe.md` | ✅ Nuevo — postmortem completo |
| `docs/runbook/postmortems/2026-07-06-trial-expiry-not-enforced.md` | ✅ Nuevo — postmortem completo |
| `docs/runbook/postmortems/README.md` | ✅ Índice actualizado con ambos |
| `docs/runbook/setup-cron-scheduler.md` | ✅ Procedimiento corregido y verificado (era la causa de que el cron nunca se hubiera configurado bien) |
| `docs/features/saas-billing.md` | ✅ `hasActivePlan()` actualizado + patrón `client_reference_id` documentado |
| `docs/features/feature-gating.md` | ✅ Nota del chequeo en tiempo real + limitación conocida (sin gate server-side genérico) |
| `docs/features/uploads.md` | ✅ Fix de AVIF documentado |
| `docs/features/expirar-trials-manuales-2026-06-18e.md` | ✅ Corregida la afirmación falsa sobre el cron |
| `docs/features/billing-activate-existing-2026-06-18d.md` | ✅ Extensión `plan_slug` documentada |
| `docs/features/billing-modal-plan-switcher.md` | ✅ Validación cruzada + días restantes de trial documentados |
| `docs/CONTINUAR.md` | ✅ Corrección de la afirmación falsa sobre el cron + resumen de sesión |
| `docs/PENDIENTES.md` | ✅ Sección de sesión con resuelto/abierto |
| `CLAUDE.md` | ✅ 2 reglas críticas nuevas (mínimas, con link a los postmortems para el detalle) |
| ADRs | Sin cambios — ninguno de los fixes es una decisión arquitectónica nueva, son correcciones de implementación/infra |

## Lo que queda pendiente (sin resolver, anotado en `PENDIENTES.md`)

1. Revisar si ClickToDo/ClickToBarber/ClickToShop tienen el mismo bug de
   cron sin shell — comparten la cuenta de Hostinger y el mismo patrón
   `cd X && comando` en sus crons de `schedule:run`. No revisados (son
   otros proyectos, fuera de alcance de esta sesión).
2. Sin alerta automática que hubiera detectado el problema del trial antes
   — ej. "N locales con `trial_ends_at` vencido hace >24h y `plan_status`
   aún `trialing`".
3. Base CRUD (crear pedidos/productos) no tiene ningún gate server-side de
   "plan activo" — solo el frontend (`PlanInactiveScreen`) y features
   premium específicas vía middleware `feature:X`. Requiere diseño
   cuidadoso de un middleware nuevo, no abordado hoy.
4. Mensaje específico en español para otros errores de validación del
   wizard de onboarding más allá del caso de email duplicado (ya resuelto).

## Métricas de la sesión

| Métrica | Valor |
|---|---|
| Commits de código | 4 |
| Commits de documentación | 2 (postmortems + este cierre) |
| Archivos de código tocados | 13 |
| Tests nuevos | 9 (`DetectOrphanStripeLocalsTest` ×3, `acepta_avif_real`, `PlanModelTest` ×2, otros de la suite de billing) |
| Suite completa | 259 → 265 tests, todos verdes |
| Deploys a producción | 3 API + 2 web, todos con health check OK |
| Cambios de infraestructura (Hostinger) | 3 crons recreados, 3 scripts `.sh` nuevos en el servidor |
| Docs nuevos | 3 (2 postmortems + este cierre) |
| Docs existentes actualizados | 10 |
| Incidentes cerrados | 2 (1 SEV-1, 1 SEV-2) |
| Rollbacks | 0 |
