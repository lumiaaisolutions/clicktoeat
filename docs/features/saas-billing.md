# Feature — SaaS Billing (Stripe Checkout + suscripciones)

> Arquitectura del módulo de cobro recurrente. Decisión arquitectónica:
> [`ADR-011`](../decisions/ADR-011-saas-pricing-and-feature-gating.md).
> Setup operativo en Stripe: [`runbook/configurar-stripe.md`](../runbook/configurar-stripe.md).
> Sistema de gating (qué módulos desbloquea cada plan):
> [`feature-gating.md`](./feature-gating.md).

## Planes

| Plan | Slug | Precio | Trial | Features incluidas (keys) |
|------|------|--------|-------|---------------------------|
| Esencial | `essential` | $99 MXN/mes | 14 días | `branding_basico`, hasta 30 productos, 5 categorías, sin staff extra |
| Profesional | `professional` | $299 MXN/mes | 14 días | + `inventario`, `recetas`, `compras`, `metricas_basicas`, `notificaciones`, `qr_personalizado`, `branding_avanzado`, `staff_multi` (3 máx) |
| Premium | `premium` | $499 MXN/mes | 14 días | + `pos`, `metricas_avanzadas`, `audit_log`, `restore`, `staff_ilimitado` |

Cada plan **incluye todo lo del anterior**. La lista exhaustiva de feature keys vive en [`feature-gating.md`](./feature-gating.md).

## Esquema de BD

### Migración 1 — Tabla `plans`

```php
Schema::create('plans', function (Blueprint $t) {
    $t->id();
    $t->string('slug', 32)->unique();           // 'essential', 'professional', 'premium'
    $t->string('nombre', 100);
    $t->integer('precio_mxn_centavos');         // 9900, 29900, 49900
    $t->string('stripe_price_id', 100);         // price_xxx
    $t->json('features');                       // ['inventario', 'pos', ...]
    $t->integer('max_productos')->nullable();   // null = ilimitado
    $t->integer('max_categorias')->nullable();
    $t->integer('max_staff')->nullable();
    $t->boolean('activo')->default(true);
    $t->integer('orden');                       // para mostrar en pricing
    $t->timestamps();
});
```

Seeder idempotente que lee `stripe_price_id` de `.env`. El admin del proyecto crea los productos en Stripe primero, copia los IDs al `.env`, y corre `php artisan db:seed --class=PlansSeeder`.

### Migración 2 — Extender `locales`

```php
Schema::table('locales', function (Blueprint $t) {
    $t->foreignId('plan_id')->nullable()->constrained('plans');
    $t->enum('plan_status', [
        'trialing', 'active', 'past_due', 'canceled', 'incomplete',
    ])->default('incomplete');
    $t->string('stripe_customer_id', 100)->nullable();
    $t->string('stripe_subscription_id', 100)->nullable();
    $t->timestamp('trial_ends_at')->nullable();
    $t->timestamp('current_period_ends_at')->nullable();
    $t->timestamp('canceled_at')->nullable();
});
```

Estados:
- `incomplete`: pago en proceso o no terminó checkout.
- `trialing`: en trial sin tarjeta. Acceso completo a su plan.
- `active`: suscripción al día.
- `past_due`: último pago falló. Gracia 3 días, después se downgrade a `incomplete`.
- `canceled`: cancelado. Mantiene acceso hasta `current_period_ends_at`.

### Migración 3 — Tabla `subscription_events`

Idempotencia + audit log de eventos de Stripe:

```php
Schema::create('subscription_events', function (Blueprint $t) {
    $t->id();
    $t->foreignId('local_id')->nullable()->constrained('locales');
    $t->string('stripe_event_id', 100)->unique();   // idempotencia
    $t->string('type', 100);                         // 'invoice.paid', etc.
    $t->json('payload');                             // raw event
    $t->timestamp('processed_at')->nullable();
    $t->text('error')->nullable();
    $t->timestamps();
});
```

`UNIQUE` en `stripe_event_id` garantiza que un webhook reentregado no duplique procesamiento.

## Modelos Eloquent

### `Plan`

```php
class Plan extends Model
{
    protected $casts = ['features' => 'array'];

    public function locales(): HasMany {
        return $this->hasMany(Local::class);
    }

    public function priceMxn(): float {
        return $this->precio_mxn_centavos / 100;
    }

    public function hasFeature(string $key): bool {
        return in_array($key, $this->features ?? [], true);
    }
}
```

### `Local` — extensiones

```php
class Local extends Model
{
    // ...existente

    public function plan(): BelongsTo {
        return $this->belongsTo(Plan::class);
    }

    public function hasActivePlan(): bool {
        if (! $this->plan_id) return false;
        if (in_array($this->plan_status, ['trialing', 'active'], true)) return true;
        // Canceled pero todavía dentro del periodo pagado
        if ($this->plan_status === 'canceled' && $this->current_period_ends_at?->isFuture()) {
            return true;
        }
        return false;
    }
}
```

## API endpoints

### `POST /api/v1/billing/checkout`

Crea Stripe Checkout Session.

```php
// BillingController::checkout
public function checkout(StartCheckoutRequest $req): JsonResponse
{
    $plan = Plan::where('slug', $req->plan_slug)->where('activo', true)->firstOrFail();

    $session = StripeCheckout::create([
        'mode' => 'subscription',
        'payment_method_collection' => 'if_required',  // sin tarjeta en trial
        'line_items' => [[
            'price' => $plan->stripe_price_id,
            'quantity' => 1,
        ]],
        'subscription_data' => [
            'trial_period_days' => 14,
            'metadata' => ['plan_slug' => $plan->slug],
        ],
        'success_url' => config('app.url').'/onboarding?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => config('app.url').'/?canceled=true',
        'allow_promotion_codes' => true,
        'locale' => 'es-419',
    ]);

    return response()->json(['session_url' => $session->url]);
}
```

**No requiere auth** — el cliente aún no tiene cuenta. La cuenta se crea en `/onboarding` después del checkout.

### `GET /api/v1/billing/session/{session_id}`

Verifica el resultado del checkout y devuelve un token temporal de onboarding.

```php
public function session(string $sessionId): JsonResponse
{
    $session = StripeCheckout::retrieve($sessionId);

    if ($session->payment_status !== 'paid' && $session->status !== 'complete') {
        return response()->json(['message' => 'Pago no confirmado'], 402);
    }

    // Crea Local + Owner si no existen
    $local = Local::firstOrCreate(
        ['stripe_customer_id' => $session->customer],
        [
            'nombre' => 'Mi local',
            'slug' => 'temp-'.Str::random(8),
            'plan_id' => $this->planFromSession($session)->id,
            'plan_status' => 'trialing',
            'stripe_subscription_id' => $session->subscription,
            'trial_ends_at' => now()->addDays(14),
        ],
    );

    // Token de onboarding (TTL 24h, una sola ruta)
    $token = OnboardingToken::issueFor($local);

    return response()->json([
        'onboarding_token' => $token->value,
        'local_id' => $local->id,
    ]);
}
```

### `POST /api/v1/onboarding/{step}`

Wizard de 5 pasos:

1. `password` — set password del owner + email.
2. `local` — nombre + slug + tagline.
3. `branding` — logo + colores.
4. `contacto` — WhatsApp + dirección + horarios.
5. `finalizar` — emite token Sanctum permanente, marca onboarding completo.

Requiere `Authorization: Bearer <onboarding_token>`.

### `POST /api/v1/webhooks/stripe`

Endpoint público (sin auth Sanctum) que recibe eventos de Stripe.

```php
public function stripe(Request $req): Response
{
    $payload = $req->getContent();
    $sig = $req->header('Stripe-Signature');

    try {
        $event = StripeWebhook::constructEvent(
            $payload, $sig, config('stripe.webhook_secret'),
        );
    } catch (SignatureVerificationException) {
        return response('Invalid signature', 400);
    }

    // Idempotencia
    if (SubscriptionEvent::where('stripe_event_id', $event->id)->exists()) {
        return response('Already processed', 200);
    }

    SubscriptionEvent::create([
        'stripe_event_id' => $event->id,
        'type' => $event->type,
        'payload' => $event->toArray(),
    ]);

    // Dispatch handler
    app(WebhookHandler::class)->handle($event);

    return response('OK', 200);
}
```

### `GET /api/v1/billing/portal`

Genera URL al Customer Portal de Stripe (cambiar plan, cancelar, descargar facturas).

```php
public function portal(): JsonResponse
{
    $local = app(TenantContext::class)->local();
    $session = StripeBillingPortal::create([
        'customer' => $local->stripe_customer_id,
        'return_url' => config('app.url').'/admin/billing',
    ]);
    return response()->json(['url' => $session->url]);
}
```

## Handlers de webhook

Implementados en `App\Services\Billing\WebhookHandler`:

| Evento de Stripe | Acción |
|------------------|--------|
| `checkout.session.completed` | Crear Local (si no existe) + setear `plan_status='trialing'` |
| `customer.subscription.created` | Guardar `stripe_subscription_id`, `current_period_ends_at` |
| `customer.subscription.updated` | Si cambió `items[0].price.id` → actualizar `plan_id`. Si `status` cambió → actualizar `plan_status` |
| `customer.subscription.trial_will_end` | (3 días antes del fin de trial) — email recordatorio |
| `invoice.paid` | `plan_status='active'`, actualizar `current_period_ends_at` |
| `invoice.payment_failed` | `plan_status='past_due'` + email con link al portal |
| `customer.subscription.deleted` | `plan_status='canceled'`, `canceled_at=now()` (mantiene acceso hasta `current_period_ends_at`) |

Cada handler:
- Es idempotente (lookup por `stripe_event_id`).
- Loguea a `audit_logs`.
- Si falla, marca `error` en `subscription_events` y deja que Stripe reintente (devuelve 500).

## Flujo end-to-end

```
1. Landing → click "Empezar Profesional"
2. POST /billing/checkout { plan_slug: 'professional' }
3. Redirect a Stripe Checkout
4. Usuario completa email (sin tarjeta — trial 14d)
5. Stripe redirige a /onboarding?session_id=cs_xxx
6. Frontend GET /billing/session/cs_xxx → recibe onboarding_token
7. Wizard 5 pasos guarda Local + User
8. Paso 5 finalizar → emite Sanctum token, redirect a /admin
9. Dashboard con módulos del plan desbloqueados + bloqueados con candado

En paralelo:
10. Stripe dispara checkout.session.completed → webhook actualiza el local
11. Al día 14: Stripe pide tarjeta → si paga, invoice.paid → plan_status='active'
12. Si no paga al día 14: subscription queda en 'incomplete' → bloqueamos
```

## Pricing UI en landing

Nueva sección entre `WhyClickToEatSection` y `SystemPreviewSection`:

- 3 cards centradas, breakpoint `md` → grid 3 cols.
- Plan "Profesional" destacado como `Más popular` (badge + border accent).
- Lista de features con `<Icon name="check" />` verde.
- Features NO incluidas con `<Icon name="x" />` muted.
- CTA "Empezar 14 días gratis" → POST `/billing/checkout` → redirect.
- Sub-texto "Sin tarjeta requerida. Cancela cuando quieras."
- Toggle Monthly / Yearly (futuro — primero MVP solo monthly).

## Página `/admin/billing`

Una página del admin con:

- Plan actual + status + `current_period_ends_at`.
- Botón "Cambiar plan" → GET `/billing/portal` → Stripe Portal.
- Botón "Cancelar suscripción" → confirm modal → Stripe Portal.
- Historial de facturas (en el portal de Stripe).
- Si `plan_status === 'past_due'` → banner rojo con CTA "Actualizar método de pago".

## Tests

- `BillingCheckoutTest` — simula creación de Checkout Session con stripe-mock.
- `WebhookSignatureTest` — verifica que firmas inválidas se rechazan.
- `WebhookIdempotencyTest` — el mismo `stripe_event_id` no se procesa 2 veces.
- `OnboardingFlowTest` — wizard completo end-to-end.
- `PlanGatingTest` — un local `essential` no puede crear el producto 31.
- `TrialExpirationTest` — fast-forward 14 días → si no paga → `incomplete`.

## Variables de entorno

```env
STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

STRIPE_PRICE_ESSENTIAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM=price_xxxxxxxxxxxxx

# Trial
SAAS_TRIAL_DAYS=14
SAAS_GRACE_DAYS_PAST_DUE=3
```

Frontend usa solo:

```env
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
# (las llamadas a Stripe Checkout pasan por el backend, no por el frontend)
```

## Plan de implementación

Detallado en [`ADR-011`](../decisions/ADR-011-saas-pricing-and-feature-gating.md). Resumen:

| Fase | Trabajo | Duración |
|------|---------|----------|
| 11.1 | Modelo + Stripe SDK | 1 d |
| 11.2 | Stripe Checkout + pricing UI | 2 d |
| 11.3 | Onboarding flow | 2 d |
| 11.4 | Webhooks | 1 d |
| 11.5 | Feature gating backend | 2 d |
| 11.6 | Feature gating frontend | 2 d |
| 11.7 | Customer Portal | 0.5 d |
| 11.8 | Emails transaccionales | 1 d |
| 11.9 | Tests + observabilidad | 1 d |
| 11.10 | Docs finales + ADR ajustes | 0.5 d |
| **Total** | | **~13 d** |

## Métricas a trackear

Para el dashboard interno (super_admin):

| Métrica | Cómo se calcula |
|---------|-----------------|
| MRR | `SUM(plan.precio_mxn_centavos)` de locales con `plan_status IN ('active', 'trialing')` |
| ARR | MRR × 12 |
| Trial→Paid conversion | `COUNT(trialing→active) / COUNT(trialing creados últimos 30 días)` |
| Churn rate | `COUNT(canceled últimos 30 días) / COUNT(active inicio del mes)` |
| LTV | `1 / churn_rate × ARPU` |
| Plan distribution | `COUNT GROUP BY plan_slug` |
| Top de upgrade path | events `customer.subscription.updated` con cambio de price |

## Ver también

- [`ADR-011`](../decisions/ADR-011-saas-pricing-and-feature-gating.md) — Decisión arquitectónica
- [`feature-gating.md`](./feature-gating.md) — Cómo se desbloquean los módulos
- [`runbook/configurar-stripe.md`](../runbook/configurar-stripe.md) — Setup paso a paso en Stripe Dashboard
- [`runbook/cambiar-precio-plan.md`](../runbook/cambiar-precio-plan.md) — Procedimiento ops
