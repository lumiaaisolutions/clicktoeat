# Fix: Stripe respeta trial restante (no cobra hoy) — 2026-06-18 (tarde 5)

Bug crítico de UX/UC encontrado: el flujo `/billing/activate-existing`
cobraba inmediatamente $299 al cliente que entra a "Agregar tarjeta",
contradiciendo el banner que dice *"No te cobramos nada hoy"*.

## Síntoma

1. Owner del local Postres Stitch (en trial manual, 14 días) entra a
   `/admin/billing` → ve banner amber: *"Tu trial termina en 14 días.
   Agrega tu tarjeta antes para mantener tu local activo. **No te
   cobramos nada hoy.***"
2. Pulsa **"Agregar tarjeta y activar"** → redirige a Stripe Checkout
3. Stripe Checkout muestra:
   - *"Suscríbete a Professional"*
   - *"MXN 299.00 por mes"*
   - **"Total adeudado hoy: MXN 299.00"** ← INCONGRUENTE
4. Si el cliente captura tarjeta → Stripe le cobra los $299 ese mismo
   día (NO al final del trial)

## Causa raíz

El endpoint `BillingController::activateExisting` creaba la Stripe
Checkout Session en `mode=subscription` SIN pasar `subscription_data.trial_end`.
Stripe interpreta ausencia de trial como "suscripción que arranca YA" →
cobro inmediato del primer mes.

El endpoint público `/billing/checkout` (para signups nuevos) sí pasa
`trial_period_days: 14`, por eso ahí funciona. El nuevo
`activate-existing` lo omitía porque "el local ya estaba en trial",
pero olvidé que Stripe es independiente — necesita su propio campo
para respetar el periodo.

## Fix

`apps/api/app/Http/Controllers/Api/BillingController.php` —
`activateExisting()`:

```php
// Calcular trial restante
$trialEndTs = null;
if ($local->trial_ends_at && $local->trial_ends_at->isFuture()) {
    // Pasamos el timestamp EXACTO del trial restante del local.
    // Stripe lo respeta tal cual.
    $trialEndTs = $local->trial_ends_at->timestamp;
} elseif ($local->plan_status === 'trialing') {
    // Edge: trial técnicamente vencido pero status no actualizado aún.
    // Damos 1 hora para que el checkout muestre "$0 today" igual.
    $trialEndTs = now()->addHour()->timestamp;
}

$subscriptionData = [
    'metadata' => [...],
];
if ($trialEndTs) {
    $subscriptionData['trial_end'] = $trialEndTs;
    // Si el cliente NO completa método de pago durante el trial, Stripe
    // cancela la sub. Evita "trial infinito sin tarjeta" si por algún
    // motivo el checkout queda a medias.
    $subscriptionData['trial_settings'] = [
        'end_behavior' => ['missing_payment_method' => 'cancel'],
    ];
}
```

## Comportamiento correcto (lo que el cliente verá AHORA)

1. Owner pulsa "Agregar tarjeta y activar" → Stripe Checkout
2. Stripe muestra:
   - *"Suscríbete a Professional"*
   - *"MXN 299.00 por mes"*
   - **"Total adeudado hoy: MXN 0.00"**
   - *"Tu suscripción comenzará el [fecha exacta de trial_ends_at]"*
3. Captura tarjeta → cobro $0
4. Stripe guarda el método de pago contra el customer
5. Al expirar `trial_end` → Stripe genera automáticamente la primera
   factura y cobra al método guardado
6. Webhook `invoice.payment_succeeded` llega → backend pasa a `active`

## Combinación con `payment_method_collection: 'always'`

Ya teníamos `payment_method_collection: 'always'`. Con `trial_end` set:

- ✅ Stripe muestra *"$0 due today"*
- ✅ Stripe **exige** capturar tarjeta antes de finalizar (no permite
  "skip card")
- ✅ Al final del trial Stripe cobra automático

Sin `trial_end` con `'always'`: cobra hoy.
Sin `trial_end` con `'if_required'`: NO pide tarjeta (peligroso —
trial sin tarjeta sin forma de cobrar después).
Con `trial_end` + `'always'`: el comportamiento correcto que queremos.

## Archivos tocados

```
apps/api/app/Http/Controllers/Api/BillingController.php  # +trial_end en activate-existing
```

## Verificación

- ✅ 194/194 phpunit verde (sin cambios en tests, el endpoint sigue contestando 200)
- ✅ Stripe Checkout en modo test confirma "MXN 0.00 due today"
- ✅ Cobro automático al final del trial garantizado por Stripe (no
     depende de nuestro cron — todo server-side de Stripe)
