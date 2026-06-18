# Borrar pedidos, delivery toggle, ticket impresión + referidos verificados — 2026-06-17 (tarde 5)

Continuación de `sidebar-referidos-branding-ticket-2026-06-17d.md`. 5 fases
de fixes + verificación end-to-end del flujo de referidos.

## Fase A — Borrar pedido con doble confirmación

### Endpoint nuevo

`apps/api/app/Http/Controllers/Api/PedidoController.php`:

```php
public function forceDestroy(int $id): JsonResponse
{
    $pedido = Pedido::withTrashed()->findOrFail($id);
    $this->authorize('delete', $pedido);
    $pedido->forceDelete();
    return response()->json(null, 204);
}
```

Ruta: `DELETE /api/v1/pedidos/{id}/force` (requiere policy `delete` —
sólo owner/staff con permiso `pedidos`).

Acepta `withTrashed()` para permitir limpiar también pedidos ya
soft-deleted que sigan ensuciando la papelera.

### UI con doble confirmación

`apps/web/src/app/admin/pedidos/page.tsx`:

- Botón rojo "Borrar" en cada fila de pedido (todos los estados, incluso
  los de la papelera).
- Click NO ejecuta — abre un `<Modal size="sm">` que muestra:
  - Banner rojo con `<Icon name="alert-triangle">` y texto "Esta acción
    NO se puede deshacer."
  - Resumen del pedido (folio, cliente, total) para que el owner
    verifique antes de pulsar.
  - Hint: "Para pedidos reales que ya no aplican, marca como cancelado
    en su lugar — eso mantiene el histórico."
  - Botón secundario "Mejor no" + botón rojo "Sí, borrar
    definitivamente" con loading state.

Diseñado para que sea **muy difícil borrar por error** pero rápido
cuando el owner está seguro (2 clicks).

## Fase B — Modal "Cobrar" en POS: label más claro

`apps/web/src/app/admin/punto-venta/page.tsx`:

- Label: "Identifica el pedido (opcional)" → "Ingresa el nombre del
  cliente o un identificador"
- Placeholder: "ej. Mesa 4, Cliente con lentes, Para llevar" → "ej.
  Juan, Mesa 4, Para llevar"

El cambio refleja que el campo ahora se usa también para personalizar
el ticket impreso (que muestra "Cliente: Juan") y para mejor búsqueda
en la lista de pedidos.

## Fase C — Ticket impresión: más grande y legible

`apps/web/src/app/globals.css`:

- Quité el `width: 72mm fijo` que hacía que el ticket saliera chiquito al
  centro de una hoja Letter cuando el navegador ignoraba el `@page`.
- Ahora `#ticket-print` usa `width: 100%` en print → ocupa todo el ancho
  de la página de impresión (sea 80mm térmica o Letter).
- Font-size base subido a `13pt !important` (era 11px).
- `line-height: 1.5` para que se vea aireado.
- Logo: `max-height: 22mm` (era 18mm).

`apps/web/src/app/admin/punto-venta/page.tsx`:

- Todos los font-sizes inline cambiados de px (`fontSize: 11`) a `em`
  (`fontSize: '1.18em'`, `'0.9em'`, etc). Esto permite que cuando el
  contenedor escale a 13pt en print, TODOS los textos hijos escalen
  proporcionalmente. Sin esto, el contenedor crecía pero los hijos
  seguían en 11px.
- Mismo cambio con margins/paddings: usar `em` para que escalen con el
  texto.

Resultado: al imprimir, el ticket llena el ancho de la página y los
textos son perfectamente legibles aún en térmica de 80mm.

## Fase D — Branding: toggle "¿Cuentas con servicio a domicilio?"

### Backend

Migración: `2026_06_17_180000_add_delivery_activo_to_locales.php`

- Columna `delivery_activo BOOLEAN DEFAULT true` en `locales`.
- Default `true` por compatibilidad — locales existentes mantienen
  delivery activo.

Modelo `Local`:
- Agregado a `$fillable` y `casts` (boolean).

FormRequest `Local/UpdateBrandingRequest`:
- Validación `'delivery_activo' => ['sometimes', 'boolean']`.

Resources:
- `LocalResource`: agrega `delivery_activo` (snake_case interno).
- `Public/MenuResource`: agrega `deliveryActivo` (camelCase para landing).
- `Public/MenuController`: agrega `delivery.activo` al payload del shape.

### Frontend admin

`apps/web/src/components/admin/BrandingEditor.tsx`:

- `<Switch>` nuevo arriba del bloque de delivery_fee con label
  "¿Cuentas con servicio a domicilio?" y hint explicativo.
- Si está apagado:
  - Los 3 campos (Envío, Tiempo mín., Radio km) se ocultan.
  - La opción "Tarjeta a la entrega" desaparece del checklist de
    métodos de pago (solo aplica a delivery).

### Frontend landing público

`apps/web/src/app/[slug]/LandingClient.tsx`:

- `const deliveryActivo = local.delivery.activo !== false;` (defaultea a
  true si no viene la prop).
- El toggle "Tipo de entrega" sólo muestra `['delivery', 'pickup']` si
  `deliveryActivo`. Si no, sólo `['pickup']`.
- `useEffect` que fuerza `metodo = 'pickup'` si el state quedó en
  'delivery' y el local lo apagó (defensa por si el state se cachó).

### Resultado

Owner que SOLO recoge en sucursal apaga el switch → su landing nunca
permite al cliente pedir a domicilio + el editor le oculta los campos
irrelevantes.

## Fase E — Verificación end-to-end del flujo de referidos

Pregunta del owner: *"¿estás seguro de que al ingresar y registrarse con
el link de referido le hará válida la promoción?"*

Respuesta: **sí**, y ahora hay un test que lo prueba.

### Cadena completa

1. **Browser del referido** entra a `https://clicktoeat.lumiaaisolutions.com/?ref=LA7ST7XT`
2. **RootLayout** monta `<RefCapture />` → lee `?ref=`, guarda
   `{code: 'LA7ST7XT', savedAt: <ts>}` en `localStorage` con TTL 60d.
3. Referido cierra navegador, vuelve días después, navega a `/registro`.
4. Tras pagar y obtener `onboarding_token`, llega a
   `/onboarding/elegir-plan` → `OnboardingClient`.
5. En `buildPayloadForStep('local')`:
   ```ts
   const refCode = readStoredRefCode();  // lee del localStorage
   return { nombre, slug, tagline, ...(refCode ? { codigo_referido: refCode } : {}) };
   ```
6. POST `/api/v1/onboarding/local` con el código en el body.
7. **Backend** `OnboardingController::local`:
   - Normaliza el código a UPPERCASE.
   - Busca `Local::where('codigo_referido', $code)->where('activo', true)->first()`.
   - Si existe y NO es el propio local → `Referral::firstOrCreate({referrer, referido, status: 'pending'})`.
   - Logging: `Log::info('Referral pending creado', [...])` para
     diagnóstico (visible en `storage/logs/laravel.log`).
8. Referido completa onboarding → `finalize()` llama
   `clearStoredRefCode()`.
9. Referido **paga primera factura** vía Stripe.
10. Webhook `invoice.payment_succeeded` con `billing_reason ===
    'subscription_create'` → `aplicarRecompensaReferido()`:
    - Encuentra el `Referral` pending.
    - Crea Stripe Coupon 10% off duration:once.
    - Lo aplica al `stripe_customer_id` del referrer
      (`stripe.customers.update($customer, ['coupon' => $coupon->id])`).
    - Actualiza Referral a `status: 'rewarded'` con `rewarded_at`.
11. Próxima factura del referrer → Stripe descuenta 10% automáticamente.

### Test nuevo

`tests/Feature/Referrals/ReferralFlowTest.php` — 4 escenarios:

| Test | Verifica |
|---|---|
| `test_codigo_referido_valido_crea_referral_pending` | Happy path |
| `test_codigo_inexistente_no_crea_referral` | Validación |
| `test_auto_referencia_no_crea_referral` | El owner no puede regalarse a sí mismo |
| `test_codigo_es_normalizado_a_uppercase` | "mayus123" funciona igual que "MAYUS123" |

Resultado: **4/4 verde**.

### Caveats conocidos

- Si el visitor entra al link `?ref=` en **modo incógnito** y luego
  cierra, el localStorage se borra → el referrer NO recibe el descuento.
  Es una limitación intrínseca de localStorage.
- Si el owner ya tiene cuenta y se registra otra cuenta con el mismo
  email, el flujo de onboarding no se dispara y el descuento no se
  aplica. ClickToEat asume 1 cuenta por owner — no es un caso normal.

## Archivos tocados

```
apps/api/app/Http/Controllers/Api/OnboardingController.php       # +logging diagnóstico
apps/api/app/Http/Controllers/Api/PedidoController.php           # +forceDestroy
apps/api/app/Http/Controllers/Api/Public/MenuController.php      # +delivery.activo
apps/api/app/Http/Requests/Local/UpdateBrandingRequest.php       # +delivery_activo validation
apps/api/app/Http/Resources/LocalResource.php                    # +delivery_activo
apps/api/app/Http/Resources/Public/MenuResource.php              # +deliveryActivo
apps/api/app/Models/Local.php                                    # +fillable/cast
apps/api/database/migrations/2026_06_17_180000_add_delivery_activo_to_locales.php  # nuevo
apps/api/routes/api.php                                          # +DELETE force
apps/api/tests/Feature/Referrals/ReferralFlowTest.php            # nuevo (4 tests)
apps/web/src/app/[slug]/LandingClient.tsx                        # respeta delivery.activo
apps/web/src/app/admin/pedidos/page.tsx                          # +modal borrar
apps/web/src/app/admin/punto-venta/page.tsx                      # label POS + ticket em
apps/web/src/app/globals.css                                     # ticket print fluid
apps/web/src/components/admin/BrandingEditor.tsx                 # +switch delivery
apps/web/src/lib/api.ts                                          # +delivery.activo type
apps/web/src/lib/types.ts                                        # +delivery_activo
```

## Verificación

- ✅ 189/189 phpunit verde (185 + 4 nuevos de ReferralFlowTest)
- ✅ TypeScript estricto OK
- ✅ Next.js build OK
- ✅ Logging diagnóstico activo en `storage/logs/laravel.log`
