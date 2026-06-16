# Feature — Multi-sucursal Business plan ($799 MXN) — skeleton

> **Estado**: docs + plan completo. NO implementado en BD/código.
> Es un cambio MAYOR del modelo multi-tenancy: tocaría TenantContext,
> middleware EnforceTenantScope, autenticación, Stripe sub, etc.

## Caso de uso

Cadena de 3-5 sucursales (ej. franquicia de tacos con 4 puntos).
Hoy tendría que crear 4 cuentas separadas, pagar 4 veces, gestionar
catálogos individuales. Con Business: 1 cuenta, 1 sub, hasta 5 locales
bajo el mismo owner.

## Modelo de datos

```
organizations
├── id
├── nombre
├── plan_id              → planes.id  (siempre 'business' u otro habilitado)
├── plan_status
├── stripe_customer_id
├── stripe_subscription_id
├── trial_ends_at
├── current_period_ends_at
└── timestamps

locales
├── ... (campos existentes)
├── organization_id      → organizations.id (nullable mientras migramos)
└── plan_id              → NULL si organization tiene plan (override)

users
└── organization_id      → para super-owners de la organización
                          (los staff por local mantienen local_id)
```

## Plan Business

```php
[
  'slug'   => 'business',
  'nombre' => 'Negocio',
  'precio_mxn_centavos' => 79900,  // $799
  'orden'  => 30,
  'features' => /* todas las de professional + */ [
    'multi_sucursal',
    'consolidated_reports',        // métricas combinadas de todas las sucursales
    'central_inventory',           // futuro: inventario compartido
  ],
  'max_productos' => null,
  'max_categorias' => null,
  'max_staff' => null,
  'max_locales' => 5,              // <-- nueva columna en plans
]
```

## TenantContext + scope

Hoy `TenantContext::id()` devuelve `local_id`. Para Business hay que
agregar `TenantContext::organizationId()` y que las queries de Local
filtren por organización del owner. Algo así:

```php
class TenantContext {
  protected ?int $organizationId = null;
  protected ?int $currentLocalId = null;   // local activo dentro de la org
  ...
}
```

Middleware nuevo `EnforceOrganizationScope` aplicado en `routes/api.php`
para queries que usen `Local::query()` sin tenant.

## UI cambios

- **Selector de local** en el sidebar admin (dropdown arriba del avatar).
- `/admin/locales` muestra los locales de la organización.
- `/admin/locales/nuevo` para agregar otro (límite max_locales).
- Cada local mantiene su admin tal cual; sólo cambia el contexto.

## Plan de implementación (estimado 7 días dev)

1. **Día 1-2**: migración + modelo Organization + auth refactor + tests.
2. **Día 3-4**: TenantContext multi-nivel + middleware + scope refactor.
3. **Día 5**: UI selector de local + onboarding wizard de organización.
4. **Día 6**: PlansSeeder agrega 'business' + checkout flow.
5. **Día 7**: Métricas consolidadas + tests + docs.

## Migración de locales existentes

Cada local existente se queda sin organización (legacy mode). Owner
puede "convertir" su local en organización desde `/admin/billing/upgrade-to-business`,
lo que crea Organization y mueve el `plan_id` ahí.

## Por qué NO implementé hoy

- Requiere refactor del multi-tenancy completo (un día solo de planning)
- Cambia el modelo de subscripciones Stripe (sub a Organization, no a Local)
- Sin demanda actual confirmada — implementar solo cuando llegue cliente real

## Ver también
- [`architecture/multi-tenancy.md`](../architecture/multi-tenancy.md) — modelo actual
- [`saas-billing.md`](saas-billing.md) — planes actuales
