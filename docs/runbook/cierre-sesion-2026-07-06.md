# Cierre de sesión — 2026-07-06 (port desde ClickToShop)

Sesión ejecutada desde el contexto de ClickToShop (el fork hijo), que portó
de vuelta a ClickToEat dos mejoras ya probadas allá. Todo desplegado a
producción el mismo día.

## 1. SEV-2 CERRADO — token fuera de localStorage 🎉

El último hallazgo crítico del audit de junio quedó implementado (era el
"bloque azul" planeado en ADR-010; el sprint estimado de 5-7 días se
resolvió portando el patrón ya probado en ClickToShop):

- `app/Support/AuthCookie.php` (nuevo): cookie `cte_token` HttpOnly,
  Secure en prod, SameSite=Lax, TTL 7 días, dominio `config('session.domain')`.
- Cookie emitida en login, signup-prospect y onboarding finalizar; logout
  la expira (ahora con domain — antes el forget no lo pasaba).
- Frontend: `withCredentials`, token SOLO en memoria, purga one-time de la
  key legacy `clickeat:token`, `hydrate()` siempre intenta `/auth/me`,
  guard de elegir-plan por sesión real.
- **`SESSION_DOMAIN=.lumiaaisolutions.com` agregado al `.env` de prod**
  (requisito para que la cookie viaje entre subdominios).
- La app móvil NO se toca: el bearer explícito sigue teniendo prioridad.
- Suite 259 verde. Commit `e79e7db`. Referencia completa del patrón:
  `../clicktoshop/docs/security/sev-2-cookie-httponly.md`.

## 2. Fix Tailwind alpha-values (colores "lavados")

Los tokens `var(--ce-*, #hex)` no generaban modificadores de opacidad —
`text-ink/40`, `border-ink/10` etc. eran no-ops silenciosos en ~18 sitios.
Fix: colores como `rgb(var(--ce-<x>-rgb) / <alpha-value>)` + triplets espejo
en `globals.css` (:root y .ce-dark) + inyección del triplet del accent por
tenant en LandingClient. Commit `2d55731`.

(Se revisó ClickToBarber: usa Tailwind 4 `@theme inline` → NO tiene el bug.)

## 3. Operación

- Ambos commits desplegados (API + web) con health checks OK; smoke de
  tiendas 200.
- ClickToEat quedó monitoreado por UptimeRobot (web + `/up` del API, cada
  5 min, alertas al email del owner) — setup documentado en
  `../clicktoshop/docs/infra/observabilidad.md`.
- **La suscripción Premium $499 de prueba del owner fue cancelada**
  (2026-07-06, era prueba; llevaba 3 `invoice.payment_failed` desde el
  07-04) → el local de prueba asociado caerá a `canceled` vía webhook.
  Comportamiento esperado, no es un bug.

## Nota para futuras sesiones

El incidente de locales huérfanos duplicados que motivó los fixes de
billing en ClickToShop (post-mortem en
`../clicktoshop/docs/runbook/postmortems/2026-07-06-checkout-triplicado.md`)
usó como referencia el fix YA implementado aquí — pero en ClickToShop
resultó que solo cubría "activate-existing", no el alta nueva. **Vale
verificar si ClickToEat tiene la misma laguna en el flujo de alta nueva**
(checkout sin `client_reference_id` del prospecto + índices únicos de
Stripe en `locales`): los fixes de referencia son AUDIT-P1..P4 y la
migración `unique_stripe_ids_on_locales` de ClickToShop.
