# Billing Modal — selector de plan

El modal "Facturación · {local}" en `/admin/locales` ahora muestra el plan
contratado actualmente del local y permite **cambiarlo** sin pasar por
Stripe checkout. Útil para:

- Clientes que pagan en efectivo o por transferencia (combinarlo con el
  toggle "Cobro fuera del sistema").
- Clientes VIP / partners a los que se les regala upgrade.
- Demos / locales de prueba que necesitan acceso temporal a Premium.

## Vista

```
┌────────────────────────────────────────────────────┐
│ Plan                  [Activo: Premium · $499/mes] │
│ ┌────────┐  ┌──────────────┐  ┌────────┐          │
│ │Esencial│  │ Profesional  │  │Premium │ ✓        │
│ │ $99/mes│  │  $299/mes    │  │$499/mes│          │
│ └────────┘  └──────────────┘  └────────┘          │
│ Cambia el plan sin pasar por Stripe — útil cuando │
│ cobras en efectivo o transferencia.               │
└────────────────────────────────────────────────────┘
```

El plan activo se muestra con un badge emerald en la esquina superior y
con borde verde + check en la card correspondiente.

## Implementación

### Backend

Ya existía soporte completo:
- `LocalController@updateBilling` aceptaba `plan_id` como parámetro
  (`exists:plans,id`).
- `LocalResource` ahora también incluye la relación `plan` expandida con
  `{ id, slug, nombre, precio_mxn }` para que el frontend pueda mostrar
  el badge sin pedirlo aparte.
- `LocalController@index` ahora carga `with('plan:id,slug,nombre,precio_mxn_centavos')`.

### Frontend

- `/admin/locales/page.tsx → BillingModal`:
  - Estado nuevo `planId` + `planes[]`.
  - `useEffect` al abrir el modal hace `GET /billing/plans` para llenar el catálogo.
  - Badge "Activo: …" arriba del selector.
  - Selector de 3 cards con feedback visual emerald (border + ring + check).
  - El `save()` ahora también envía `plan_id`.

## Combinación con "Cobro fuera del sistema"

Para un cliente que va a pagar en efectivo:
1. Seleccionar el plan que tiene (Essential / Professional / Premium).
2. Activar el toggle "Cobro fuera del sistema" + dejar nota interna.
3. Cambiar el estado a "Al corriente".
4. Guardar.

Resultado: el local accede al panel con las features de ese plan, sin que
el sistema espere pagos via Stripe.
