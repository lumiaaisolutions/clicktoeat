# Restaurar stripe_price_id en planes (post-deploy 2026-06-16)

## Contexto

Durante el deploy del 16/06/2026, el `PlansSeeder` corrió en producción para añadir el plan **Premium** (F88). Como las vars `STRIPE_PRICE_ESSENTIAL` y `STRIPE_PRICE_PROFESSIONAL` no estaban presentes en el `.env` de producción al momento de la ejecución, el seeder (antes del fix de `0270e30`) **sobrescribió a NULL** los `stripe_price_id` de los planes Essential y Professional.

**Impacto**:
- Los locales con `local.stripe_subscription_id` activo siguen cobrando correctamente. Stripe maneja la renovación desde la suscripción existente, no necesita el plan price ID.
- El endpoint `GET /billing/plans` devuelve los planes con `available_for_purchase: false`.
- Los locales **nuevos** que intenten hacer checkout o cambiar de plan vía Stripe **fallarán** con `PLAN_NOT_PROVISIONED` (503).

## Fix aplicado

Commit `0270e30`: `PlansSeeder` ahora preserva el `stripe_price_id` existente si el `env` está vacío. Re-correrlo es seguro.

## Cómo restaurar

### 1. Obtén los Price IDs

Login en Stripe (https://dashboard.stripe.com — **live mode** si producción usa live):

- Products → **ClickToEat Esencial** → copia `price_1XXXXX...`
- Products → **ClickToEat Profesional** → copia `price_1XXXXX...`
- (Opcional) Products → **ClickToEat Premium** → si ya lo creaste, copia `price_1XXXXX...`. Si no, ver siguiente sección.

### 2. SSH al servidor y pegar en .env

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cd ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html

# Edita .env con tu editor favorito (nano funciona). Asegúrate de tener:
nano .env
# o:
vi .env
```

Variables que deben estar (poner los valores reales):

```bash
STRIPE_PRICE_ESSENTIAL=price_1XXXXX...
STRIPE_PRICE_PROFESSIONAL=price_1XXXXX...
STRIPE_PRICE_PREMIUM=price_1XXXXX...
```

### 3. Limpiar cache y re-seed

```bash
php artisan config:clear
php artisan config:cache
php artisan db:seed --class=PlansSeeder --force
```

Debería decir: `PlansSeeder: 3 planes activos (essential, professional, premium).`

### 4. Verificar

```bash
curl https://clicktoeat-api.lumiaaisolutions.com/api/v1/billing/plans | jq '.data[].available_for_purchase'
```

Los 3 valores deben ser `true`.

### 5. Restart Passenger (opcional, sólo si config:cache no surtió efecto)

```bash
touch -a .htaccess
```

## Crear plan Premium nuevo en Stripe

1. https://dashboard.stripe.com/products → **+ Add product**
2. Name: **ClickToEat Premium**
3. Price: **599.00 MXN** recurrente mensual
4. Copia el `price_id` (`price_1...`) → pégalo en `STRIPE_PRICE_PREMIUM` del paso 2

## Por qué no se cayó nada

- Los locales con suscripción activa hoy: su renovación mensual la lanza Stripe basado en `local.stripe_subscription_id`. El `price_id` del plan en BD solo se usa al CREAR un checkout nuevo.
- La columna `local.plan_id` no cambió — los planes siguen vinculados a los locales.
- `feature_gating` sigue funcionando porque lee `plan.features` (JSON), no `stripe_price_id`.

## Cómo evitar esto en el futuro

El seeder ahora preserva valores existentes. Si necesitas forzar un cambio de price (por subir precio en Stripe), edita la columna directamente vía tinker:

```bash
php artisan tinker --execute="\App\Models\Plan::where('slug','essential')->update(['stripe_price_id' => 'price_NUEVO']);"
```
