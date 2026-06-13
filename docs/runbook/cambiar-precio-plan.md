# Runbook — Cambiar precio de un plan

> Procedimiento ops para cambiar el precio de un plan existente. Crítico:
> en Stripe **no se puede editar el precio de un Price existente** — siempre
> se crea un Price nuevo. Esto tiene implicaciones para los clientes activos.

## Cuándo se hace

- Subida de precio anual (ej. $299 → $329 por inflación).
- Lanzamiento de un plan nuevo (raro — es mejor un slug nuevo).
- Cambio de tax behavior (Inclusive ↔ Exclusive).

## Lo que TIENES que entender antes

### En Stripe los precios son inmutables

- Un `price_xxx` se crea una vez. Su `unit_amount` no se puede editar.
- Para "cambiar precio", creas un **Price nuevo** sobre el mismo Product, y archivas el viejo.

### Los clientes activos NO suben de precio automáticamente

- Una `subscription` apunta a un `price_xxx` específico. Sigue con ese precio mientras no la actualices.
- Esto es **bueno** (no rompes contratos) pero **requiere comunicación** si vas a migrarlos.

### Hay tres estrategias

1. **Grandfathering** (recomendado para subidas): clientes viejos mantienen su precio. Nuevos pagan el nuevo. Cero conflicto.
2. **Migración con aviso**: notificas 30 días antes que migrarás a todos al nuevo precio. Stripe permite cambiar la subscription al nuevo `price_xxx` en la fecha del próximo billing cycle.
3. **Migración inmediata**: cambias todos al precio nuevo desde el siguiente periodo. Riesgo de churn alto. Solo si es bajada de precio.

## Procedimiento — Subida con grandfathering

### Paso 1 — Crear Price nuevo en Stripe

1. https://dashboard.stripe.com/products → click en el producto a modificar.
2. Tab **Pricing** → **+ Add another price**.
3. Llenar:
   - Amount: nuevo precio
   - Currency: MXN
   - Billing period: Monthly
4. Save. Copia el nuevo `price_xxx`.

### Paso 2 — Archivar Price viejo (opcional)

Si NO quieres que nuevos clientes vean el viejo:

1. En el producto → tab Pricing → click los tres puntos del Price viejo → **Archive price**.
2. El Price queda inactivo para nuevos checkouts. Las subscriptions existentes siguen funcionando.

### Paso 3 — Actualizar `.env` y seeder

```env
# Antes
STRIPE_PRICE_PROFESSIONAL=price_AAAAA  # 299

# Después
STRIPE_PRICE_PROFESSIONAL=price_BBBBB  # 329
```

Reiniciar PHP, correr seeder. La columna `plans.precio_mxn_centavos` se actualiza
para que el frontend muestre el nuevo precio en pricing.

### Paso 4 — Verificar

- Página pública de pricing muestra $329.
- Stripe Checkout con plan_slug='professional' usa price_BBBBB.
- Clientes con subscription en price_AAAAA siguen pagando $299 en su siguiente factura.

## Procedimiento — Migrar clientes existentes al nuevo precio

> Solo si el grandfathering no es viable (ej. estás re-pricing globalmente porque
> tu unit economics no daban). Comunica claro y con 30 días.

### Paso 1 — Notificar a los clientes (30 días antes)

Email a todos los `locales` con `plan_slug='professional'`:

```
Asunto: Cambio en el precio del plan Profesional

Hola [nombre],

A partir del [fecha], el plan Profesional de ClickToEat pasa de $299 a $329 MXN
mensuales. Este cambio refleja [razón breve y honesta].

Tu siguiente factura del [fecha próximo billing] será al nuevo precio.

Si no estás de acuerdo, puedes cambiar a Esencial o cancelar antes del [fecha]:
[link al portal]

Gracias por seguir con nosotros.
```

### Paso 2 — Esperar la fecha

NO toques las subscriptions antes.

### Paso 3 — Update masivo

Comando Artisan custom (a implementar):

```bash
php artisan saas:migrar-subscripciones --plan=professional \
  --from=price_AAAAA --to=price_BBBBB \
  --effective-at=next_period
```

Internamente, por cada subscription afectada:

```php
$stripe->subscriptions->update($sub->id, [
    'items' => [[
        'id' => $sub->items->data[0]->id,
        'price' => 'price_BBBBB',
    ]],
    'proration_behavior' => 'none',  // sin prorrateo — cambia en próximo billing
    'billing_cycle_anchor' => 'unchanged',
]);
```

Stripe respeta el ciclo de billing actual — el cambio aplica desde la siguiente factura.

### Paso 4 — Monitorear

- Stripe Dashboard → Reports → Net volume.
- Métricas internas: churn de los 7 días siguientes al cambio.
- Si churn > 15% en una semana, considerar reversión parcial (grandfathering retroactivo a los que cancelaron).

## Procedimiento — Bajar precio

Mucho más simple, pero hay 2 paths:

### Opción A — Bajar a futuros, mantener viejos (raro)

Mismo proceso que subida con grandfathering. Casi nadie hace esto — sería injusto.

### Opción B — Bajar a todos inmediatamente (lo común)

Mismo comando de migración pero con `proration_behavior: 'create_prorations'` para
darle un crédito a los clientes activos por la parte ya pagada del periodo actual:

```php
$stripe->subscriptions->update($sub->id, [
    'items' => [[
        'id' => $sub->items->data[0]->id,
        'price' => 'price_LOWER',
    ]],
    'proration_behavior' => 'create_prorations',
]);
```

Stripe genera automáticamente un line item negativo en la próxima factura.

## Procedimiento — Cambio de features sin cambio de precio

Si solo agregas un feature a un plan existente (ej. `metricas_avanzadas` ahora
está en Profesional), NO tocas Stripe.

1. Editar `database/seeders/PlansSeeder.php` — agregar la feature al array.
2. Correr seeder en prod.
3. Listo — los clientes activos ven el nuevo módulo desbloqueado al refrescar.

Si la nueva feature es muy valiosa, considera anunciarla por email:
> "Buenas noticias: como cliente Profesional, ahora tienes métricas avanzadas
> incluidas sin costo extra."

## Errores que no debes cometer

- ❌ **Editar el `unit_amount` de un Price en Stripe Dashboard**: el botón "Edit" engaña — solo permite editar nombre, no amount. Si Stripe te deja, es que el Price aún no tuvo subscripciones.
- ❌ **Borrar el Price viejo cuando hay subscriptions activas**: rompe el billing del cliente. Solo archivar.
- ❌ **Subir precios sin notificar**: violación de Ley Federal de Protección al Consumidor (México). 30 días mínimos.
- ❌ **Subir precio + dejar el `precio_mxn_centavos` viejo en BD**: la página de pricing va a mentir. Sincroniza siempre.

## Ver también

- [`configurar-stripe.md`](./configurar-stripe.md) — Setup inicial
- [`features/saas-billing.md`](../features/saas-billing.md) — Arquitectura del billing
- [Stripe — Migrate subscriptions to new prices](https://stripe.com/docs/billing/subscriptions/migrate)
