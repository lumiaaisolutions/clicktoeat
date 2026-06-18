# Cierre de sesión — 2026-06-18

Sesión larga continuación del 2026-06-17. Resumen de qué se hizo,
commits, archivos clave y resultados.

## Commits del 2026-06-18

```
378d52c  fix(billing): activate-existing respeta trial restante + cron expira trials manuales
e32b839  fix(billing): activar local existente sin crear nuevo + auto-heal trial_ends_at + banner funcional
e8360cd  fix(billing+ayuda): trial manual sin Stripe + botón reiniciar tutoriales
7376d34  fix(landing): orbs ahora claramente visibles — más rango, opacidad y float
a3c91e8  feat(landing): orbs interactivos al mouse + fix mobile PinnedFoodStory
ce8d079  feat(pos+ui+admin): cantidad/extras en POS, cards en pedidos, tours, sucursales, emails sin etiquetas, auditoría timeline
```

6 commits en el día, todos desplegados a producción.

## Bloques de trabajo (en orden cronológico)

### 1. POS + UI + admin (commit ce8d079)
Doc: `docs/features/pos-listas-tours-sucursales-emails-auditoria-2026-06-18.md`

- **POS**: dropdown de categorías + modal "Agregar al pedido" con
  cantidad +/− y aviso si tiene extras
- **Lista de pedidos**: tabla plana → grid de cards con avatar circular
  por estado
- **Tours**: pedidos (5 steps), punto-venta (5 steps), branding (4
  steps), sucursales (nuevo)
- **Sidebar**: nuevo ítem "Sucursales" con candado (feature
  `multi_sucursal` plan Premium) + página `/admin/sucursales`
  informativa
- **Super_admin**: nuevo formulario "Editar datos del owner" (nombre +
  email) + endpoint `PATCH /admin/users/{user}/profile`
- **Emails**: fuera el panel amarillo con `{{ tokens }}`. Botones
  "Insertar nombre del cliente / Total / etc." que insertan en el
  cursor sin exponer sintaxis técnica
- **Auditoría**: tabla → timeline visual agrupado por día con avatares
  y badges coloreados por acción + chips de filtro

### 2. Landing principal (commits a3c91e8 + 7376d34)
Doc: `docs/features/orbs-mobile-foodstory-2026-06-18b.md`

- **Hero orbs interactivos**: nuevo componente `InteractiveOrbs` con 3
  blobs (rojo/verde/naranja) que:
  - Flotan continuamente en loop (translateY + scale) → siempre se ve
    movimiento, aún sin tocar el mouse
  - Spring stiffness 120 + damping 18 → siguen al cursor con parallax
  - Touch devices NO montan el listener (cero overhead mobile)
  - Range hasta 240px de desplazamiento (antes 80px era imperceptible)
- **PinnedFoodStory mobile fix**:
  - `h-screen` → `h-[100svh]` (URL bar dinámica iOS)
  - Imagen: `aspect-[4/5]` → `aspect-[4/3]` + `max-h-[45svh]`
  - Texto: altura fija 280px → auto con `min-h-[180px]`
  - Título `text-4xl` → `text-[26px]` para que "Cero comisiones. Cero
    intermediarios." no se corte en iPhone

### 3. Trial billing — fixes en cadena (commits e8360cd, e32b839, 378d52c)
Docs:
- `docs/features/billing-trial-manual-tours-reset-2026-06-18c.md`
- `docs/features/billing-activate-existing-2026-06-18d.md`
- `docs/features/expirar-trials-manuales-2026-06-18e.md`
- `docs/features/stripe-trial-end-respected-2026-06-18f.md`

Bug master: super_admin pone un local "En prueba" sin Stripe → flujo
roto en múltiples puntos. Cerramos cada hueco:

| Sub-bug | Fix |
|---|---|
| "Termina en  días" sin número | `updateBilling` auto-setea `trial_ends_at=+14d` + `/auth/me` auto-heal retroactivo |
| Botón "Agregar tarjeta" del banner sin reacción | Cambiar `<Link>` a `<button>` con handler contextual (navega o dispara checkout) |
| Mensaje rojo "no tiene suscripción activa" confuso | Solo aparece si NO está en trial; durante trial el banner amber cubre |
| Click en "Agregar tarjeta y activar" → `/onboarding/elegir-plan` (loop incorrecto) | Nuevo endpoint `POST /billing/activate-existing` que crea Checkout con `client_reference_id=local:N` |
| Webhook creaba local nuevo en lugar de actualizar el existente | Webhook ahora respeta `client_reference_id` o `metadata.existing_local_id` antes de buscar por customer/sub |
| Trial manual vencido jamás se bloqueaba (sin Stripe webhook) | Cron `trials:expire-manual` diario 10:30am pasa a `incomplete` → `PlanInactiveScreen` bloquea |
| Stripe cobraba $299 inmediato al activar (no respetaba trial) | Pasar `subscription_data.trial_end = trial_ends_at` → Stripe muestra "MXN 0.00 due today" y cobra automático al expirar |

**Bonus**: nuevo método `resetAll()` en helpCenter store + botón
"Volver a ver los tutoriales" en `/admin/ayuda` para limpiar los
marcadores VISTO.

## Tests

**194/194 phpunit verde**. Tests nuevos hoy:

- `tests/Feature/Billing/ExpireManualTrialsTest.php` — 5 escenarios
  (vencido, vigente, con Stripe sub, pago_externo, idempotencia)

(Anteriormente subimos de 185 → 189 con `tests/Feature/Referrals/ReferralFlowTest.php` en sesión 2026-06-17.)

## Archivos nuevos en esta sesión

```
apps/api/app/Console/Commands/ExpireManualTrialsCommand.php
apps/api/tests/Feature/Billing/ExpireManualTrialsTest.php
apps/web/src/app/admin/sucursales/page.tsx
apps/web/src/components/landing/InteractiveOrbs.tsx
docs/features/pos-listas-tours-sucursales-emails-auditoria-2026-06-18.md
docs/features/orbs-mobile-foodstory-2026-06-18b.md
docs/features/billing-trial-manual-tours-reset-2026-06-18c.md
docs/features/billing-activate-existing-2026-06-18d.md
docs/features/expirar-trials-manuales-2026-06-18e.md
docs/features/stripe-trial-end-respected-2026-06-18f.md
docs/runbook/cierre-sesion-2026-06-18.md  (este archivo)
```

## Archivos modificados clave

| Archivo | Cambio |
|---|---|
| `apps/api/app/Http/Controllers/Api/AuthController.php` | +has_stripe_customer + auto-heal trial_ends_at |
| `apps/api/app/Http/Controllers/Api/BillingController.php` | +activateExisting con trial_end |
| `apps/api/app/Http/Controllers/Api/Admin/LocalController.php` | updateBilling auto-set trial_ends_at |
| `apps/api/app/Http/Controllers/Api/PasswordController.php` | +updateUserProfile (super_admin edita owner) |
| `apps/api/app/Services/Billing/WebhookHandler.php` | Respeta client_reference_id |
| `apps/api/bootstrap/app.php` | +cron trials:expire-manual |
| `apps/api/routes/api.php` | +POST activate-existing + PATCH users/{user}/profile |
| `apps/web/src/app/admin/auditoria/page.tsx` | Timeline visual |
| `apps/web/src/app/admin/ayuda/page.tsx` | +botón reset tutoriales |
| `apps/web/src/app/admin/billing/page.tsx` | Checkout vs portal contextual |
| `apps/web/src/app/admin/email-templates/page.tsx` | Botones insertar variable en cursor |
| `apps/web/src/app/admin/layout.tsx` | +Sucursales sidebar |
| `apps/web/src/app/admin/locales/[id]/usuarios/page.tsx` | +EditarOwnerForm |
| `apps/web/src/app/admin/pedidos/page.tsx` | Cards en lugar de tabla |
| `apps/web/src/app/admin/punto-venta/page.tsx` | Modal agregar + dropdown categoría |
| `apps/web/src/app/DirectoryClient.tsx` | +InteractiveOrbs |
| `apps/web/src/components/billing/TrialBanner.tsx` | Botón con handler |
| `apps/web/src/components/help/tours.ts` | Tours actualizados |
| `apps/web/src/components/landing/PinnedFoodStory.tsx` | Fix mobile |
| `apps/web/src/store/helpCenter.ts` | +resetAll |
| `apps/web/src/store/plan.ts` | +has_stripe_customer |

## Estado de producción al cierre

```
$ curl -s -o /dev/null -w "API: %{http_code}\n" https://clicktoeat-api.lumiaaisolutions.com/up
API: 200

$ curl -s -o /dev/null -w "WEB: %{http_code}\n" https://clicktoeat.lumiaaisolutions.com/
WEB: 200

$ git log -1 --oneline
378d52c  fix(billing): activate-existing respeta trial restante + cron expira trials manuales
```

## Para la próxima sesión

Lee primero **`docs/CONTINUAR.md`** y luego **`docs/PENDIENTES.md`**.
Ambos están actualizados al 2026-06-18 con el snapshot completo.

Si vienes a investigar el flujo de trial, lee en este orden:

1. `docs/features/billing-trial-manual-tours-reset-2026-06-18c.md` (contexto inicial)
2. `docs/features/billing-activate-existing-2026-06-18d.md` (endpoint nuevo)
3. `docs/features/expirar-trials-manuales-2026-06-18e.md` (cierre del ciclo)
4. `docs/features/stripe-trial-end-respected-2026-06-18f.md` (Stripe trial_end)

Y luego `docs/CONTINUAR.md` §"Ciclo del trial" tiene el diagrama
end-to-end.
