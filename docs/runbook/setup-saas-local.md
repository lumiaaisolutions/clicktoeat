# Runbook — Levantar el módulo SaaS en local

> Pasos para verificar el flujo end-to-end (pricing → Stripe Checkout →
> onboarding wizard → /admin) en tu máquina, sin tocar producción.

## 1. Variables `.env` del API

Agrega a `apps/api/.env` (no commitees el archivo):

```env
# === Stripe (test mode) ===
STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

STRIPE_PRICE_ESSENTIAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM=price_xxxxxxxxxxxxx

# === SaaS config ===
SAAS_TRIAL_DAYS=14
SAAS_GRACE_DAYS_PAST_DUE=3
SAAS_ONBOARDING_TOKEN_TTL_HOURS=24

# === URLs de retorno ===
# Apuntan al frontend local. En producción cambian a clicktoeat.lumiaaisolutions.com.
APP_URL_FRONTEND=http://localhost:3000
STRIPE_SUCCESS_URL=http://localhost:3000/onboarding?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/?canceled=true
STRIPE_PORTAL_RETURN_URL=http://localhost:3000/admin/billing
```

Cómo obtener los valores de Stripe: ver [`configurar-stripe.md`](configurar-stripe.md).

Para arrancar SIN Stripe (modo "código solo, sin cobro real"):

- Omite `STRIPE_*` del `.env` — el seeder corre igual y crea los 3 planes
  con `stripe_price_id = NULL`.
- En la pricing UI las cards mostrarán **"Próximamente"** (botón
  deshabilitado).
- El feature gating y el panel admin siguen funcionando — solo el checkout
  contra Stripe queda capado.

## 2. Variable `.env.local` del frontend (opcional)

`apps/web/.env.local` ya debería tener `NEXT_PUBLIC_API_URL`. Agrega si quieres:

```env
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

No es estrictamente necesario hoy — el frontend pasa por `/billing/checkout`
del backend, no usa Stripe.js directo.

## 3. Migraciones + seeder

```bash
cd apps/api
php artisan migrate
php artisan db:seed --class=PlansSeeder
```

El seeder es **idempotente**: re-ejecutarlo solo actualiza los campos sin
crear duplicados ni romper locales asociados a un plan.

Verifica:

```bash
php artisan tinker --execute='\App\Models\Plan::all(["slug","nombre","stripe_price_id"])'
```

## 4. Webhooks de Stripe en local — Stripe CLI

Los webhooks de Stripe no llegan a `localhost` por defecto. Usa el CLI:

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to http://localhost:8080/api/v1/webhooks/stripe
```

El CLI imprimirá un **webhook secret** (empieza con `whsec_`) que debes
poner en `apps/api/.env` como `STRIPE_WEBHOOK_SECRET`. Es distinto al de
producción.

Cada evento que dispare Stripe se redirige al endpoint local. Para
disparar uno manualmente:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

## 5. Levantar API + Web

Dos terminales:

```bash
# Terminal 1 — API
cd apps/api && php artisan serve --port=8080

# Terminal 2 — Web
cd apps/web && npm run dev
```

## 6. Smoke tests del flujo SaaS

| # | Acción | URL | Esperado |
|---|--------|-----|----------|
| 1 | Abrir landing | http://localhost:3000 | Sección "Planes" visible entre "Por qué" y "Sistema" con 3 cards |
| 2 | Click "Empezar 14 días gratis · Profesional" | — | Redirect a `checkout.stripe.com/...` |
| 3 | Completar con email de prueba (sin tarjeta) | Stripe Checkout | Redirect a `localhost:3000/onboarding?session_id=...` |
| 4 | Wizard | `/onboarding` | 5 pasos completables: password, local, branding, contacto, finalizar |
| 5 | Tras finalizar | Redirect a `/admin` | Estás autenticado, sidebar con todos los módulos (Profesional desbloquea inventario/recetas/compras/métricas) |
| 6 | Items bloqueados | sidebar | "Audit log" con candado (Premium only) |
| 7 | Visita `/admin/billing` | — | Plan card con "En trial", countdown a 14 días, botón "Cambiar plan" |
| 8 | Click "Cambiar plan" | — | Redirect a Stripe Customer Portal (test mode) |
| 9 | En Stripe CLI corres `stripe trigger invoice.paid` | — | `plan_status` cambia a `active`, banner trial desaparece |
| 10 | `stripe trigger invoice.payment_failed` | — | `plan_status` = `past_due`, banner rojo aparece arriba del admin |

## 7. Tests automatizados

```bash
cd apps/api
php vendor/bin/phpunit tests/Feature/Billing/
```

Esperado: **18/18 pass**.

Cubre:
- `FeatureGatingTest` — essential bloqueado en inventario/audit-log,
  professional accede a inventario, premium a audit-log, límite de productos.
- `WebhookIdempotencyTest` — firma inválida → 400; secret vacío → 500.
- `PlanModelTest` — `hasActivePlan()` en los 5 estados.
- `BillingPlansEndpointTest` — `/billing/plans` devuelve 3 planes;
  checkout rechaza slug inválido; 503 si plan no tiene `stripe_price_id`.

## 8. Rollback de migraciones (si necesitas)

```bash
php artisan migrate:rollback --step=4
```

Esto deshace, en orden: `create_onboarding_tokens` → `create_subscription_events`
→ `add_subscription_fields_to_locales` → `create_plans`.

## 9. ¿No puedes generar las claves de Stripe ahora?

No bloquea. El sistema queda **mostrando los 3 planes con CTA "Próximamente"**
y el resto del código (gating, webhook handlers, /admin/billing) compila y
puede inspeccionarse. Cuando entren las claves, basta con re-correr el
seeder:

```bash
php artisan db:seed --class=PlansSeeder
```

y los `stripe_price_id` quedan poblados sin tocar nada más.

## Ver también

- [`configurar-stripe.md`](configurar-stripe.md) — paso a paso en Stripe Dashboard
- [`../features/saas-billing.md`](../features/saas-billing.md) — arquitectura del módulo
- [`../features/feature-gating.md`](../features/feature-gating.md) — qué desbloquea cada plan
- [`../decisions/ADR-011-saas-pricing-and-feature-gating.md`](../decisions/ADR-011-saas-pricing-and-feature-gating.md) — decisión arquitectónica
