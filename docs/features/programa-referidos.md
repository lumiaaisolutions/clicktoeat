# Feature — Programa de referidos (10% off mes siguiente)

> **Estado**: BD lista (migración aplicada). Lógica de webhook + UI admin pendientes.

## Cómo funciona

1. Cada local SaaS tiene un **`codigo_referido`** auto-generado (ej. `STITCH-4F7K`).
2. Cuando un owner nuevo entra al onboarding, ve un input opcional
   "¿Tienes código de quien te recomendó?".
3. Si el código es válido, se crea un `Referral` con `status='pending'`.
4. Cuando el referido paga su **primera factura** (`invoice.paid` webhook),
   el `Referral` pasa a `'rewarded'` y se aplica un **Stripe Coupon del 10%**
   por **1 mes** al referrer.
5. El referrer ve su descuento en `/admin/billing` el próximo cobro.
6. El referrer puede recomendar a N personas — cada uno da 10% off acumulable
   hasta un mes (eg. 10 referidos = 100% off ese mes, que es el límite).

## BD

```sql
locales.codigo_referido    -- string unique nullable
referrals (
  referrer_local_id,
  referred_local_id,
  status   ENUM('pending','rewarded','invalid'),
  rewarded_at,
  stripe_coupon_id
)
```

## Implementación pendiente

### Backend

1. **Generador del código** — en `Local::booted` cuando se crea, generar
   `codigo_referido = strtoupper(substr($slug, 0, 6).'-'.Str::random(4))`.
2. **OnboardingController::local** — aceptar campo `codigo_referido` y
   crear `Referral{status:'pending', referrer_local_id: lookup, referred_local_id: token.local_id}`.
3. **WebhookHandler::onInvoicePaid** — cuando es **primer pago** del
   referido (no recurrente), buscar referral pending y:
   - Crear Stripe Coupon `percent_off:10, duration:once`
   - Aplicar al customer del referrer con `customer.coupon`
   - `Referral::update(status:'rewarded', rewarded_at:now(), stripe_coupon_id: coupon.id)`

### Frontend

4. **/admin/referidos** página — muestra tu código + link compartible
   (`https://clicktoeat.lumiaaisolutions.com/?ref=TUCODIGO`) + lista de
   referidos exitosos + total ahorrado a la fecha.
5. **PricingSection / Onboarding** — input "Código de referido" en el wizard.
6. **Si llega `?ref=` en URL** — guardar en localStorage y pre-llenar
   automáticamente en onboarding.

### Anti-fraud

- Mismo email no puede tener referido propio (chequeo en backend).
- Solo cuenta el primer pago, no rewards múltiples por el mismo referido.
- Si el referido cancela en los primeros 30 días, el Coupon se invalida
  (Stripe API).

## Stripe Coupon mecánica

```php
$coupon = $stripe->coupons->create([
  'percent_off'  => 10,
  'duration'     => 'once',
  'name'         => "Referido — {$referrer->slug}",
  'metadata'     => ['referrer_local_id' => $referrer->id],
]);

$stripe->customers->update($referrerCustomer->id, [
  'coupon' => $coupon->id,  // aplica al próximo invoice
]);
```

## Por qué NO terminado hoy

- Backend simple, UI también — pero requiere Stripe Coupon API live para
  testear bien (no funciona con `--write-env mock`).
- Necesita decisión: ¿descuento se acumula entre meses o cap por 1 mes?
  Hoy asumo cap 1 mes, acumulable dentro de ese mes hasta 100%.

## Ver también
- [`saas-billing.md`](saas-billing.md)
- [`runbook/configurar-stripe.md`](../runbook/configurar-stripe.md) — donde generar el coupon manual hasta automatizar
