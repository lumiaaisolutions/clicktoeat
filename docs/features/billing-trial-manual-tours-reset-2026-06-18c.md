# Fix billing trial manual + botón reiniciar tours — 2026-06-18 (tarde 2)

2 issues reportados con el local `Postres Stitch` puesto en trial manual
por el super_admin desde `/admin/locales`.

## 1. Bug: trial manual sin Stripe rompe el panel de billing

### Síntomas reportados

Local Postres Stitch (super_admin lo marcó `plan_status: trialing` desde
el modal de Facturación):

1. **Banner** mostraba: *"Tu trial de Profesional termina en  días"* —
   sin número de días.
2. **Card del plan** mostraba: *"Estás en trial. Tu trial termina en
   días."* — igual sin número.
3. Caja roja: *"Este local no tiene suscripción activa."*
4. Botón **"Cambiar plan / método de pago"** → `GET /billing/portal` →
   404 (sin response útil para el user, parecía "no hace nada").
5. Banner del CTA *"Agregar tarjeta"* → mandaba a `/admin/billing` →
   misma página rota.

### Causas

1. Cuando el super_admin marca `plan_status: trialing` desde el endpoint
   `PATCH /admin/locales/{id}/billing`, NO setea `trial_ends_at` (queda
   `null` si nunca se llenó). El frontend `daysUntilTrialEnd()` retorna
   `null` y se renderiza como `""` → "termina en  días".
2. El Customer Portal de Stripe requiere `stripe_customer_id`. Para
   locales en trial manual ese campo es vacío → `/billing/portal`
   devuelve 404 con `code: NO_STRIPE_CUSTOMER`. El frontend mostraba el
   mensaje literal del backend ("Este local no tiene suscripción
   activa") — confuso y sin acción.
3. El botón "Cambiar plan / método de pago" siempre apuntaba al portal,
   sin importar si el local tenía customer o no.

### Fixes

#### Backend

`apps/api/app/Http/Controllers/Api/Admin/LocalController.php` —
`updateBilling()` ahora **auto-setea `trial_ends_at = now() + 14 días`**
si el super_admin marca `trialing` y no proporciona la fecha (y el
local no la tiene ya):

```php
$vaATrial = ($data['plan_status'] ?? null) === 'trialing';
$sinFecha = empty($data['trial_ends_at']) && empty($local->trial_ends_at);
if ($vaATrial && $sinFecha) {
    $data['trial_ends_at'] = now()->addDays(14);
}
```

Default consistente con el trial post-checkout normal (Stripe también
da 14 días). El super_admin puede overrride pasando una fecha custom.

`apps/api/app/Http/Controllers/Api/AuthController.php` — `/auth/me`
ahora incluye `has_stripe_customer: bool` en el plan payload. El
frontend lo usa para decidir entre Customer Portal y Checkout.

#### Frontend

`apps/web/src/store/plan.ts` — agregado `has_stripe_customer?: boolean`
al type `PlanInfo`.

`apps/web/src/app/admin/billing/page.tsx`:

- **`openPortal()` inteligente**: si `!has_stripe_customer` → redirige
  a `/onboarding/elegir-plan` en lugar de pegarle al portal (que
  devolvería 404). Si sí tiene customer → abre el portal normal.
- **Copy adaptativo** del botón principal:
  - Sin customer: *"Agregar tarjeta y activar"*
  - Con customer: *"Cambiar plan / método de pago"*
- **Mensaje amber del trial** ahora maneja el caso `daysLeft === null`
  mostrando texto sin contador en lugar de "null días".
- **El error rojo "no tiene suscripción activa"** se reemplaza por un
  banner azul informativo *"Aún no has configurado tu método de pago.
  Toca 'Agregar tarjeta y activar' arriba para empezar."* — y SOLO
  aparece si el local **no está** en trial. Si está en trial, el banner
  amber ya cubre el caso.

`apps/web/src/components/billing/TrialBanner.tsx`:

- Mismo fix: si `daysLeft === null`, muestra *"Estás en trial de {plan}.
  Agrega tu tarjeta para mantener el acceso"* sin contador. CTA
  "Agregar tarjeta" sigue mandando a `/admin/billing` donde ahora
  funciona correctamente.

## 2. Botón "Volver a ver los tutoriales" en Centro de Ayuda

### Pedido del owner

Después de "saltar" o ver un tour, queda marcado como **VISTO** y ya no
auto-aparece al entrar al módulo. El owner quería un botón para limpiar
todos los marcadores y que los tours vuelvan a aparecer.

### Implementación

`apps/web/src/store/helpCenter.ts` — nuevo método `resetAll()`:

```ts
resetAll: () => {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(SEEN_KEY); } catch {}
  }
  set({ seen: new Set(), activeTour: null, activeHelp: null });
}
```

Borra el `localStorage` key `clicktoeat:tour-seen` y resetea el Set en
memoria. La próxima vez que el owner entre a un módulo,
`shouldAutoTour(slug)` retorna `true` y el `AutoTourTrigger` lo dispara.

`apps/web/src/app/admin/ayuda/page.tsx` — botón visible en el
`AdminPageHeader` solo cuando hay al menos un tour visto (`seen.size > 0`),
para no mostrar un botón inútil al usuario nuevo:

```tsx
{hayVistos && (
  <button onClick={reiniciarTodos}>
    <Icon name="history" size={14} />
    Volver a ver los tutoriales
  </button>
)}
```

Confirmación con `confirm()` antes de borrar para evitar resets
accidentales.

## Archivos tocados

```
apps/api/app/Http/Controllers/Api/Admin/LocalController.php     # auto trial_ends_at
apps/api/app/Http/Controllers/Api/AuthController.php            # +has_stripe_customer
apps/web/src/app/admin/ayuda/page.tsx                            # +botón reiniciar
apps/web/src/app/admin/billing/page.tsx                          # checkout vs portal
apps/web/src/components/billing/TrialBanner.tsx                  # null days handle
apps/web/src/store/helpCenter.ts                                 # +resetAll
apps/web/src/store/plan.ts                                       # +has_stripe_customer type
```

## Verificación

- ✅ 189/189 phpunit verde
- ✅ TypeScript estricto OK
- ✅ Next.js build OK
- ✅ Test manual: super_admin marca local trial sin fecha → backend
     setea +14 días automáticamente → frontend muestra contador correcto
