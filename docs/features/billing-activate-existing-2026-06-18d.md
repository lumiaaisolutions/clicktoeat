# Fix billing local en trial manual — 2026-06-18 (tarde 3)

3 issues finales con el local Postres Stitch puesto en trial manual por
super_admin. El fix anterior (`billing-trial-manual-tours-reset-2026-06-18c.md`)
arregló UI pero quedaban 3 huecos:

## 1. "Estás en trial de Profesional" sin días restantes

### Por qué seguía pasando

El fix anterior en `Admin/LocalController::updateBilling` solo aplicaba
a **futuras** actualizaciones. El local Postres Stitch ya tenía
`plan_status=trialing` y `trial_ends_at=null` desde antes — el código
nuevo no toca el dato existente.

### Fix: auto-heal en /auth/me

`apps/api/app/Http/Controllers/Api/AuthController.php`:

```php
if ($local && $local->plan_status === 'trialing' && empty($local->trial_ends_at)) {
    $local->forceFill(['trial_ends_at' => now()->addDays(14)])->save();
}
```

Antes de armar el payload de `/me`, detectamos el caso y rellenamos
con un trial de 14 días desde HOY. Idempotente: una vez seteado, nunca
se vuelve a tocar (el `empty()` falla).

Aplica **retroactivamente** a TODOS los locales en el sistema que
estén en este estado, sin necesidad de migration script.

## 2. Botón "Agregar tarjeta" del banner no hacía nada

### Causa

`TrialBanner.tsx` usaba `<Link href="/admin/billing">`. Si el owner ya
estaba EN `/admin/billing` (que es donde más probable que esté cuando
ve el banner), el click no cambiaba la URL → parecía "no hacer nada".

### Fix

Cambiado a `<button onClick={agregarTarjeta}>` con lógica contextual:

- **Fuera de /admin/billing**: hace `router.push('/admin/billing')`.
- **Ya en /admin/billing**: dispara directo el checkout sin requerir
  otro click. Si hay `stripe_customer_id` abre Customer Portal; si no,
  llama al nuevo endpoint `/billing/activate-existing`.

Estado `opening` muestra "Abriendo…" mientras carga.

## 3. "Empezar gratis 14 días" al activar local existente

### Causa

El botón "Agregar tarjeta y activar" redirigía a
`/onboarding/elegir-plan`. Esa página está pensada para visitantes
**nuevos sin sesión** que vienen del registro — su flujo crea un local
**nuevo** desde cero en Stripe y luego pasa por el wizard de
onboarding. Para un local que YA existe en trial manual, era un loop
incorrecto: "elige plan" → checkout crea otro local → confusión.

### Fix: endpoint nuevo `/billing/activate-existing`

`apps/api/app/Http/Controllers/Api/BillingController.php`:

```php
public function activateExisting(TenantContext $ctx): JsonResponse {
    $local = $ctx->local();
    // Si ya tiene customer → debería usar el portal, no esto
    if (!empty($local->stripe_customer_id)) abort(409);
    $plan = $local->plan;

    $session = $stripe->checkout->sessions->create([
        'mode'                       => 'subscription',
        'payment_method_collection'  => 'always',  // exigir tarjeta
        'line_items'                 => [['price' => $plan->stripe_price_id, 'quantity' => 1]],
        'subscription_data'          => [
            'metadata' => ['existing_local_id' => (string) $local->id, ...],
        ],
        'client_reference_id' => 'local:'.$local->id,
        'customer_email'      => $local->owner?->email,
        ...
    ]);
    return response()->json(['session_url' => $session->url]);
}
```

Características clave vs `/billing/checkout` (público):

| Aspecto | `/billing/checkout` (público) | `/billing/activate-existing` (auth) |
|---|---|---|
| Auth | Pública (signup nuevo) | Requiere sanctum + tenant |
| Trial | 14 días dentro de Stripe | Sin trial extra — el local ya consumió el suyo, ahora paga |
| `payment_method_collection` | `if_required` (trial sin tarjeta) | `always` (exige tarjeta YA) |
| Crea local nuevo | Sí (vía webhook) | NO — vincula al existente |
| `client_reference_id` | No usado | `local:N` — el webhook lo lee |

### Webhook actualizado

`apps/api/app/Services/Billing/WebhookHandler.php` —
`onCheckoutCompleted` ahora busca primero por `client_reference_id` o
`metadata.existing_local_id` ANTES de buscar por customer/sub:

```php
if ($clientRef && str_starts_with($clientRef, 'local:')) {
    $existingLocalId = (int) substr($clientRef, 6);
}
// ...
if ($existingLocalId) {
    $local = Local::query()->find($existingLocalId);
}
if (!$local) {
    // fallback: lookup por customer/sub (caso normal de signup nuevo)
}
```

Así garantizamos que el local original recibe la subscription, sin
duplicación.

### Frontend

`apps/web/src/app/admin/billing/page.tsx`:

- `openPortal()` ahora, cuando `!has_stripe_customer`, llama a
  `POST /billing/activate-existing` y redirige a `session_url`.
- Mantiene el copy "Agregar tarjeta y activar" para distinguir
  visualmente de "Cambiar plan / método de pago" (caso con customer).

## Flujo end-to-end del owner

1. Super_admin crea local manualmente y marca "En prueba" → backend
   auto-setea `trial_ends_at = +14d` (fix anterior).
2. Owner entra al panel → `/auth/me` confirma `trial_ends_at` (o lo
   auto-hereda si era null).
3. Banner amber: *"Tu trial de Profesional termina en 14 días"* con
   botón "Agregar tarjeta".
4. Click en "Agregar tarjeta" del banner → si está en `/admin/billing`,
   dispara directo el checkout; si está en otra página, navega ahí
   primero.
5. Checkout de Stripe abierto con `client_reference_id=local:N` →
   captura tarjeta.
6. Stripe webhook `checkout.session.completed` → busca por
   `client_reference_id` → encuentra el local existente → actualiza
   `stripe_customer_id`, `stripe_subscription_id`, `plan_status=active`.
7. Owner regresa al panel → banner desaparece, plan activo, factura
   procesada.

## Archivos tocados

```
apps/api/app/Http/Controllers/Api/AuthController.php        # auto-heal trial_ends_at
apps/api/app/Http/Controllers/Api/BillingController.php     # +activateExisting
apps/api/app/Services/Billing/WebhookHandler.php            # respeta client_reference_id
apps/api/routes/api.php                                      # +POST activate-existing
apps/web/src/app/admin/billing/page.tsx                      # llama activate-existing
apps/web/src/components/billing/TrialBanner.tsx              # botón con handler
```

## Verificación

- ✅ 189/189 phpunit verde
- ✅ TypeScript estricto OK
- ✅ Next.js build OK
