# Checkout Stripe LIVE — diagnóstico y fix

Documenta los 4 bugs que se cazaron al hacer el primer end-to-end del
checkout en producción con Stripe LIVE keys (junio 2026).

## Flow esperado

1. User en `/onboarding/elegir-plan` click un plan
2. `POST /api/v1/billing/checkout { plan_slug }` → backend crea sesión Stripe
3. Response `{ session_id, session_url }` → frontend redirige
4. User completa pago/trial en Stripe Checkout
5. Stripe redirige a `STRIPE_SUCCESS_URL` con `?session_id={CHECKOUT_SESSION_ID}`
6. `/onboarding` lee `session_id` → `POST /billing/session/{id}` → recibe `onboarding_token`
7. Wizard de onboarding (password → local → branding → contacto → finalizar)
8. Redirect a `/admin`

## Bugs encontrados

### 1. `StartCheckoutRequest` no permitía `premium`

```php
'plan_slug' => ['required', 'string', 'in:essential,professional'],
//                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                         Faltaba premium
```

**Síntoma**: al click Premium en /onboarding/elegir-plan, 422
"The selected plan slug is invalid".

**Fix**: agregar `premium` al `in:`. Si en el futuro agregamos `enterprise`
o similar, hay que actualizar esta regla.

### 2. `STRIPE_SUCCESS_URL/CANCEL_URL` no seteadas en prod

El default en `config/stripe.php` era
`env('APP_URL_FRONTEND', 'http://localhost:3000').'/onboarding?session_id=...'`.

`APP_URL_FRONTEND` no estaba seteada → caía a `localhost:3000` → Stripe LIVE
rechaza URLs no HTTPS / o redirigía a algo no resolvible.

**Fix**: agregar al `.env` de prod:
```
APP_URL_FRONTEND=https://clicktoeat.lumiaaisolutions.com
STRIPE_SUCCESS_URL=https://clicktoeat.lumiaaisolutions.com/onboarding?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://clicktoeat.lumiaaisolutions.com/?canceled=true
STRIPE_PORTAL_RETURN_URL=https://clicktoeat.lumiaaisolutions.com/admin/billing
```

### 3. `config('app.frontend_url')` nunca estaba definido

Varios Mailables (`ResumenSemanal`, `CarritoAbandonado`, `TrialNudge`) y
`ResetPasswordNotification` hacían:

```php
config('app.frontend_url', 'http://localhost:3000')
```

Pero la key `frontend_url` NO estaba definida en `config/app.php`. Por lo
tanto siempre devolvía null → fallback localhost.

**Síntoma**: clientes de los locales recibían emails con enlaces a
`localhost:3000` que no abrían.

**Fix**: agregar al `config/app.php`:
```php
'frontend_url' => env('FRONTEND_URL', env('APP_URL_FRONTEND', 'http://localhost:3000')),
```

### 4. Frontend leía `data.url` pero backend devuelve `session_url`

```js
// Antes:
const { data } = await api.post<{ url: string }>('/billing/checkout', ...);
window.location.href = data.url;  // ← undefined!
```

`BillingController@checkout` retorna `{ session_id, session_url }`, no `{ url }`.
Resultado: `window.location.href = undefined` → browser navegaba a
`current_path + "undefined"` → `/onboarding/undefined` → 404.

**Fix en frontend** (`/onboarding/elegir-plan` y `/admin/billing`):
```js
const url = data?.session_url ?? data?.url;
if (!url) { alert('No recibimos URL'); return; }
window.location.href = url;
```

(`?? data?.url` se mantiene por si en el futuro normalizamos la respuesta.)

## Verificación post-fix

```bash
curl -X POST https://clicktoeat-api.lumiaaisolutions.com/api/v1/billing/checkout \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"plan_slug":"premium","email":"test@test.com"}' \
  | python3 -m json.tool
```

Esperado:
```json
{
  "session_id": "cs_live_b1hQUhouTzhDjmt3qAOxsr4S9...",
  "session_url": "https://checkout.stripe.com/c/pay/cs_live_..."
}
```

## Auditoría adicional realizada

- Reviser TODOS los Mailables: ✅ los 9 conectados al editor de templates.
- Revisar TODOS los lugares que llaman a `config('app.frontend_url')`: ✅
  todos ahora resuelven a `https://clicktoeat.lumiaaisolutions.com`.
- Revisar la consistencia de la respuesta del checkout vs el portal:
  ⚠️ inconsistente (`session_url` vs `url`), pero ambos consumidores
  ahora son tolerantes.

## TODO para próxima iteración

- Normalizar respuesta de billing controllers para que SIEMPRE retornen
  `{ url, session_id }` (no `session_url`). Requiere actualizar el frontend
  también, y dejar deprecation aviso.
- Test E2E en CI que haga un checkout real con tarjeta de prueba.
