# Postmortem — Locales huérfanos duplicados con suscripción Stripe real

> **Date of incident**: 2026-07-06
> **Authors**: @fernando
> **Status**: closed
> **Severity**: 🟠 SEV-2 (degraded — un owner sin acceso visible a su plan + riesgo de cobro duplicado)

## TL;DR

El 2026-07-06 entre 12:34 y 12:45 UTC, el owner de "Las Cazuelas Locas" pasó 3
veces por el checkout de planes ("Ver planes" / "Empezar gratis 14 días")
porque cada intento lo regresaba a "crear cuenta" en vez de reconocer que ya
tenía cuenta y local. Esto creó 3 locales huérfanos con 3 suscripciones Stripe
en trial ($299 MXN/mes c/u, primer cobro programado 2026-07-20). Además, el
local correcto quedó sin dueño vinculado (`owner_id`/`local_id` NULL), por lo
que el owner veía "Sin suscripción activa" en su propio panel mientras el
super admin veía el plan Profesional activo para ese mismo local.

## Impacto

- **Servicios afectados**: panel admin (`/admin/billing`), checkout de Stripe, wizard de onboarding.
- **Locales afectados**: 1 cliente real (Las Cazuelas Locas) + el mecanismo era reproducible para cualquier owner existente que usara "Ver planes"/"Cambiar de plan".
- **Pedidos perdidos**: ninguno — el local nunca llegó a operar (bloqueado en onboarding).
- **Ingresos no concretados**: ninguno perdido; riesgo evitado de **doble/triple cobro** ($299 × 2 adicionales el 2026-07-20) si no se hubiera detectado antes de esa fecha.
- **Detección**: reporte directo del owner (capturas de pantalla), no había alerta automática para "locales sin owner_id con stripe_subscription_id activo".
- **Datos perdidos / filtrados**: no.

## Timeline (aprox., hora de creación de registros en BD)

| Hora (UTC-6, hora local del incidente) | Evento |
|------|--------|
| 12:34:50 | `POST /auth/signup-prospect` crea `users.id=7` (sin `local_id`), cookie `cte_token` seteada. |
| 12:35:16 | Checkout #1 completado → `BillingController::session()` crea `locales.id=6` ("Las Cazuelas Locas", `pendiente-ig62i6CPiY`), sin `owner_id`. `onboarding_tokens.id=3` emitido, nunca usado (`used_at IS NULL`). |
| ~12:41:49 | Checkout #2 completado → crea `locales.id=7` ("Mi local", `pendiente-6cqPGGqDwK`), huérfano. |
| ~12:44:26 | Checkout #3 completado → crea `locales.id=8` ("Mi local", `pendiente-eLiadO5bfB`), huérfano. |
| ~12:42–12:45 | Usuario reporta el problema con capturas de pantalla (mismatch owner vs super admin, wizard pidiendo "crear cuenta" de nuevo). |
| 13:00 (aprox.) | Diagnóstico vía SSH read-only a BD de prod confirma los 3 locales huérfanos + las 3 subscriptions Stripe activas. |
| 13:03 | Canceladas en Stripe `sub_1TqHSXRxHYFQWlidTIMBcnuM` (local 7) y `sub_1TqHV4RxHYFQWlidDEQHq2Ow` (local 8) — confirmación explícita del usuario antes de ejecutar. |
| 13:05:54 | `locales.id IN (7,8)` marcados `deleted_at`. `locales.id=6.owner_id=7` y `users.id=7.local_id=6` — vínculo reparado. Owner ve su plan Profesional en prueba correctamente. |
| Después | Fix de código desplegado (ver sección de acciones). |

## Causa raíz

1. **El checkout público (`POST /billing/checkout`) no lleva ninguna referencia
   al usuario/local que lo inicia.** No manda `client_reference_id` ni
   metadata de usuario — a diferencia de `activateExisting()`, que sí ata
   correctamente vía `client_reference_id = 'local:N'`. Este patrón ya
   existía y funcionaba para "local existente", pero nunca se extendió al
   caso "usuario ya registrado, local por crear".
2. **`BillingController::session()` crea un Local nuevo cada vez que no
   encuentra un match por `stripe_customer_id`/`stripe_subscription_id`** —
   sin ningún candado que impida crear 2, 3 o N locales para la misma sesión
   de navegador/usuario si el flujo se repite.
3. **`OnboardingController::password()` siempre intentaba crear un owner
   nuevo** para el Local recién creado por el checkout, en vez de reconocer
   que el usuario ya tenía sesión activa (cookie `cte_token` → Sanctum vía
   middleware `CookieToBearer`, que corre globalmente y sí resuelve
   `$request->user()` incluso en rutas públicas). Cuando el email coincidía
   con la cuenta ya creada, `Rule::unique('users','email')` lo rechazaba con
   422 genérico ("The given data was invalid.", sin traducir ni indicar la
   causa real), y el usuario no tenía forma de recuperarse salvo repetir el
   checkout — lo cual generaba OTRO local huérfano en cada intento.
4. **Bug independiente que agravó la confusión inicial**: `AuthController::me()`
   ocultaba el bloque `plan` completo (incluido `trial_ends_at`) si
   `local.plan_id` era `NULL`, sin mirar `plan_status`. Combinado con que
   `Admin/LocalController::updateBilling()` permitía guardar `plan_status`
   sin exigir `plan_id`, un local en trial podía ser invisible para su propio
   dueño mientras el super admin lo veía activo.

## ¿Cómo se detectó?

- ❌ Alerta automática — no existe ninguna que detecte "local con
  `stripe_subscription_id` activo pero `owner_id IS NULL`".
- ✅ Reporte de usuario (capturas de pantalla detalladas).
- ❌ Descubrimiento accidental.

Action item: no había alerta automática — ver acciones correctivas.

## ¿Qué funcionó?

- El patrón `client_reference_id` ya existía para el caso "local existente"
  (`activateExisting()`), lo que hizo el fix del caso "usuario existente"
  mucho más rápido de implementar (mismo mecanismo, nuevo prefijo `user:N`).
- Acceso SSH de solo lectura a prod permitió confirmar el estado real en BD
  (3 locales, 3 subscriptions Stripe) antes de tocar nada, evitando actuar
  sobre una hipótesis incorrecta.
- Confirmación explícita del usuario antes de cada acción irreversible
  (cancelar subscriptions de Stripe, mutar filas en prod) — ninguna acción
  financiera o destructiva se ejecutó sin luz verde puntual.

## ¿Qué falló o fue lento?

- El wizard de onboarding no daba ninguna señal clara de "ya tienes cuenta,
  inicia sesión" — el usuario no tenía forma de saber por qué se atoraba y
  probó 3 veces, multiplicando el problema.
- Sin alerta de "local sin owner con Stripe activo", el problema pudo haber
  seguido creciendo (más reintentos) o llegar al primer cobro real
  (2026-07-20) sin detectarse antes.
- El mensaje de error 422 en el paso "Tu cuenta" del wizard es genérico en
  inglés ("The given data was invalid."), no dice "ese correo ya existe" ni
  ofrece "inicia sesión en su lugar".

## Acciones correctivas

| # | Acción | Owner | Fecha objetivo | Status | Link |
|---|--------|-------|----------------|--------|------|
| 1 | `checkout()` manda `client_reference_id` (`user:N`/`local:N`) cuando hay sesión — evita crear Local huérfano | @fernando | 2026-07-06 | ✅ Done | `BillingController.php` |
| 2 | `session()`/`WebhookHandler` vinculan el Local nuevo al usuario existente en vez de dejarlo huérfano | @fernando | 2026-07-06 | ✅ Done | `BillingController.php`, `WebhookHandler.php` |
| 3 | `OnboardingController::password()` no intenta crear owner si el Local ya tiene `owner_id` | @fernando | 2026-07-06 | ✅ Done | `OnboardingController.php` |
| 4 | Wizard salta el paso "Tu cuenta" cuando `billing/session` reporta `already_linked` | @fernando | 2026-07-06 | ✅ Done | `OnboardingClient.tsx` |
| 5 | `updateBilling()` rechaza `plan_status` en vivo sin `plan_id` (422) | @fernando | 2026-07-06 | ✅ Done | `Admin/LocalController.php` |
| 6 | "Cambiar a este plan" usa el portal de Stripe (no un checkout nuevo) si el local ya tiene `stripe_customer_id` | @fernando | 2026-07-06 | ✅ Done | `admin/billing/page.tsx` |
| 7 | Modal de facturación del super admin muestra días restantes de trial | @fernando | 2026-07-06 | ✅ Done | `admin/locales/page.tsx` |
| 8 | Mensaje específico en español cuando el email ya existe en el paso "Tu cuenta" (en vez de "The given data was invalid.") | @fernando | 2026-07-06 | ✅ Done | `OnboardingController.php`, `OnboardingClient.tsx` |
| 9 | Alerta/reporte periódico: locales con `stripe_subscription_id` activo y `owner_id IS NULL` | @fernando | 2026-07-06 | ✅ Done | `DetectOrphanStripeLocalsCommand.php` (cron diario 11:00) |

## Lecciones aprendidas

- Cualquier endpoint de checkout que pueda ser llamado por un usuario **ya
  autenticado** debe atar la Stripe Checkout Session a esa identidad
  (`client_reference_id`) — un checkout "público" es seguro solo para
  visitantes sin sesión; con sesión activa, tratarlo como público crea
  entidades duplicadas silenciosamente.
- Cuando dos columnas relacionadas (`plan_id` y `plan_status`) pueden
  actualizarse independientemente desde un panel de admin, hace falta
  validación cruzada explícita — "sometimes" en ambas por separado no es
  suficiente si un estado combinado inválido tiene consecuencias visibles
  para el usuario final.
- Un wizard multi-paso que depende de un token efímero (`onboarding_token`)
  desacoplado de la sesión Sanctum del usuario puede terminar "no viendo" que
  el usuario ya existe — vale la pena que el primer paso siempre verifique
  contra la sesión real antes de asumir "usuario nuevo".
- 3 reintentos del mismo flujo roto en 9 minutos es una señal de que el
  frontend no comunicó el error real al usuario — un mensaje accionable
  ("ya tienes cuenta, inicia sesión") hubiera evitado la duplicación desde
  el primer intento.

## Apéndice

- Verificado en prod (SSH read-only, `php artisan tinker`): `locales.id 6,7,8`
  con `stripe_customer_id`/`stripe_subscription_id` reales, `owner_id NULL`;
  `users.id=7` con `local_id NULL`; `onboarding_tokens.id=3` (`used_at NULL`,
  `completed_steps NULL`) confirma que el wizard nunca se completó para el
  local 6.
- Suite completa `php artisan test` (259 tests) y `npm run typecheck` en
  verde tras el fix de código.
