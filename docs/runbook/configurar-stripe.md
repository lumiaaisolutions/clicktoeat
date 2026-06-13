# Runbook — Configurar Stripe (productos, precios, webhook, portal)

> Setup paso a paso de Stripe Dashboard para que el módulo de billing funcione.
> Esto lo hace el dueño del proyecto **una vez** antes del primer release con
> pagos. La arquitectura del módulo: [`features/saas-billing.md`](../features/saas-billing.md).
>
> Tiempo estimado: 45 minutos en modo Test, 30 minutos para replicar a Live.

## Pre-requisitos

- Cuenta de Stripe verificada con tu RFC (México).
- Acceso a `https://dashboard.stripe.com`.
- Acceso al `.env` del servidor productivo.

## Paso 1 — Crear los 3 productos en modo Test

> Trabaja primero en **Test mode** (toggle arriba a la derecha del dashboard).
> Cuando todo funcione, replicas a **Live mode**.

1. https://dashboard.stripe.com/test/products → **+ Add product**

### Producto 1 — Esencial

| Campo | Valor |
|-------|-------|
| Name | ClickToEat Esencial |
| Description | Catálogo + landing pública + pedidos por WhatsApp. Hasta 30 productos. |
| Image | Logo de ClickToEat (opcional) |
| **Pricing** | Recurring |
| Amount | 99.00 |
| Currency | MXN — Mexican Peso |
| Billing period | Monthly |
| Trial period | (déjalo vacío — el trial se configura en el Checkout) |

→ **Save product**

Después de guardar, copia el **Price ID** (algo como `price_1NQxxx...`). Lo necesitas para el `.env`.

### Producto 2 — Profesional

Mismos campos, cambiando:
- Name: `ClickToEat Profesional`
- Description: `Todo lo del Esencial + inventario, recetas, métricas y hasta 3 usuarios staff.`
- Amount: `299.00`

→ Save. Copia el Price ID.

### Producto 3 — Premium

- Name: `ClickToEat Premium`
- Description: `Todo lo del Profesional + POS interno, métricas avanzadas, audit log y staff ilimitado.`
- Amount: `499.00`

→ Save. Copia el Price ID.

## Paso 2 — Obtener API keys de Test

1. https://dashboard.stripe.com/test/apikeys
2. Copia:

| Key | Para qué | Variable en `.env` |
|-----|----------|---------------------|
| Publishable key (`pk_test_...`) | Frontend lo usa solo para inicializar Stripe.js si en el futuro migras a Elements | `STRIPE_PUBLIC_KEY` |
| Secret key (`sk_test_...`) | Backend crea Checkout Sessions, Portal Sessions, llama a la API | `STRIPE_SECRET_KEY` |

> ⚠️ **Nunca** commitees la `sk_test_...` al repo. Va siempre al `.env` del servidor (`apps/api/.env`), nunca al `.env.example`.

## Paso 3 — Configurar Webhook

El backend necesita recibir eventos de Stripe (pagos exitosos, cancelaciones, etc.).

1. https://dashboard.stripe.com/test/webhooks → **+ Add endpoint**
2. Endpoint URL:
   - Para test contra producción: `https://clicktoeat-api.lumiaaisolutions.com/api/v1/webhooks/stripe`
   - Para test local (con ngrok): `https://<ngrok-id>.ngrok-free.app/api/v1/webhooks/stripe`
3. Description: `ClickToEat — eventos de suscripción`
4. **Events to send** — Click **+ Select events** y selecciona estos 7:

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.trial_will_end
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

5. **Add endpoint**.
6. Después de crear, en la página del endpoint:
   - Sección **Signing secret** → click **Reveal**.
   - Copia el `whsec_...` → ese va a `STRIPE_WEBHOOK_SECRET` en `.env`.

## Paso 4 — Configurar Customer Portal

El portal es donde el cliente cambia su plan, cancela y descarga facturas.
Stripe lo aloja — solo configuras qué puede hacer.

1. https://dashboard.stripe.com/test/settings/billing/portal
2. **Features**:
   - ✅ **Customer information** — sí (puede actualizar email, dirección).
   - ✅ **Invoice history** — sí.
   - ✅ **Payment methods** — sí.
   - ✅ **Update subscriptions** — sí. Y abajo:
     - **Products** → selecciona los 3 productos creados.
     - **Quantities** → desactivar (no es por cantidad).
     - **Cancel subscriptions** → ✅ sí, **Cancel at end of period**.
   - **Promotion codes** — ✅ si activas códigos de descuento.
3. **Business information**:
   - Nombre comercial: `ClickToEat`
   - Privacy policy URL: `https://clicktoeat.lumiaaisolutions.com/privacy` (cuando exista)
   - Terms of service URL: `https://clicktoeat.lumiaaisolutions.com/terms` (cuando exista)
4. **Branding** (opcional, mejora la confianza):
   - Logo: 96×96 mínimo
   - Color primario: `#0B0B0F`
5. **Save**.

## Paso 5 — Pegar las variables al `.env` productivo

```bash
# Conectarse al servidor
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72

# Editar el .env
cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
nano .env
```

Agregar al final:

```env
# Stripe — TEST mode
STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

STRIPE_PRICE_ESSENTIAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM=price_xxxxxxxxxxxxx

# Trial settings
SAAS_TRIAL_DAYS=14
SAAS_GRACE_DAYS_PAST_DUE=3
```

Reiniciar PHP-FPM (LSPHP):

```bash
touch .htaccess
# o desde hPanel → Avanzado → Restart de LSPHP
```

## Paso 6 — Correr el seeder de planes

Una vez los `STRIPE_PRICE_*` están en `.env`:

```bash
ssh ... 'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan db:seed --class=PlansSeeder'
```

El seeder es idempotente — puedes correrlo varias veces, solo crea/actualiza.

## Paso 7 — Probar end-to-end en modo Test

### 7.1 Pago exitoso

1. Abre https://clicktoeat.lumiaaisolutions.com → click "Empezar Profesional".
2. En el Stripe Checkout llena:
   - Email: `test@clicktoeat.app`
   - **Tarjeta de prueba**: `4242 4242 4242 4242`
   - Expiry: cualquier fecha futura, ej. `12/30`
   - CVC: `123`
   - Nombre: cualquier
   - ZIP: `01000`
3. Submit.
4. Esperado: redirect a `/onboarding?session_id=cs_test_...`.
5. Completar wizard → llegar a `/admin`.

### 7.2 Tarjeta declinada

Repite con tarjeta `4000 0000 0000 0002` → debe quedar en pantalla de error de Stripe.

### 7.3 Trial sin tarjeta

Si pruebas el flujo con `payment_method_collection: 'if_required'`, durante el trial Stripe **no pide tarjeta**.

### 7.4 Verificar webhooks llegando

En https://dashboard.stripe.com/test/webhooks → tu endpoint → tab **Events**.
Debes ver los eventos del flujo de prueba con status `Succeeded`.

Si algún evento queda `Failed`:
- Click el evento → ver el body que Stripe envió.
- Ver el response que tu backend devolvió.
- Logs del backend: `tail -f /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/storage/logs/laravel.log`

## Paso 8 — Pasar a Live mode

Cuando todo funcione en Test:

1. Toggle a **Live mode** en Stripe.
2. Repite **pasos 1–4** en Live (los productos de Test NO se replican automáticamente).
3. Reemplaza en el `.env` las 6 keys (`STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, los 3 `STRIPE_PRICE_*`) con los valores de Live.
4. Reinicia LSPHP (`touch .htaccess`).
5. Re-corre el seeder.
6. Haz un pago real con tarjeta tuya como sanity check (puedes reembolsártelo desde el dashboard).

## Paso 9 — Configurar Tax / IVA México

Stripe puede emitir recibos con IVA 16% automáticamente.

1. https://dashboard.stripe.com/settings/tax
2. **Tax registrations** → **Add registration**.
3. País: México. Type: `RFC`. Tax ID: tu RFC.
4. **Tax rates** → crear "IVA 16%" si no existe automáticamente.
5. En cada producto, edit → **Tax behavior**: `Inclusive` (precio incluye IVA) o `Exclusive` (precio antes de IVA).

> Para **factura CFDI real** mexicana, Stripe no la genera. Necesitas un partner
> como Facturapi o SW Sapien. Posponer hasta tener 50+ clientes.

## Errores comunes

### "Invalid signature" en webhook

- El `STRIPE_WEBHOOK_SECRET` no coincide con el que Stripe muestra en el endpoint.
- Solución: revelar el secret en el endpoint, copiar tal cual, reiniciar PHP.

### "No such price" al crear Checkout

- El `STRIPE_PRICE_*` apunta a un Price ID que no existe en el modo (Test vs Live).
- Solución: confirmar que estás en el modo correcto y que el ID empieza con `price_test_...` o `price_...`.

### Webhook llega pero no actualiza el local

- Logs del backend en `storage/logs/laravel.log`.
- Verifica que `subscription_events` tenga la fila con `error` NULL.
- Si el local no tiene `stripe_customer_id`, el handler no puede correlacionar.

### El cliente quedó en `incomplete` después del trial

- Stripe pide tarjeta al día 14, si no la da queda incomplete.
- El sistema bloquea acceso (todos los módulos).
- El cliente entra a `/admin/billing` → portal → agregar tarjeta → status pasa a `active`.

## Ver también

- [`features/saas-billing.md`](../features/saas-billing.md) — Cómo el backend usa estas keys
- [`features/feature-gating.md`](../features/feature-gating.md) — Cómo se desbloquean los módulos
- [`cambiar-precio-plan.md`](./cambiar-precio-plan.md) — Procedimiento ops para subir precios
- [`ADR-011`](../decisions/ADR-011-saas-pricing-and-feature-gating.md) — Decisión arquitectónica
