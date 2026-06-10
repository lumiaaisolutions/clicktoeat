# Feature — Métricas y KPIs

`App\Services\Metricas\MetricasService::calcular($localId, $desde, $hasta)`.

Endpoint: `GET /api/v1/metricas` (ver [`api/tenant.md`](../api/tenant.md#métricas)).

## Rango temporal

Aceptado en una de dos formas:

1. `?preset=hoy|ayer|7d|30d|mes` (default `30d`).
2. `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (si hasta < desde, se invierte).

El service trabaja con `startOfDay/endOfDay` de Carbon.

## Qué incluye

### Filtro base
Pedidos del local, en el rango, **excluyendo `cancelado`** (`whereDoesntHave(...)` no aplica — usa `where('estado','!=','cancelado')`). Soft-deletes ya quedan fuera por el global scope.

### 1. `resumen`
```json
{
  "pedidos":          int,
  "ventas_total":     float,
  "ventas_subtotal":  float,
  "ingresos_envio":   float,
  "ticket_promedio":  float,
  "costo_compras":    float,
  "margen_aprox":     float,
  "margen_pct":       float,
  "bajo_stock":       int    // snapshot actual, no del rango
}
```
- `costo_compras` = suma de `compras.total` con `estado='registrada'` en el rango (por `fecha`).
- `margen_aprox` = `ventas_total - costo_compras`.
- `margen_pct` = `margen_aprox / ventas_total × 100`.

### 2. `por_estado`
`{ nuevo: 10, entregado: 120, ... }`. Útil para gráfica de embudo (visto el cancelado se excluyó del filtro).

### 3. `por_entrega`
`{ pickup: { pedidos, monto }, delivery: { ... }, sucursal: { ... } }`.

### 4. `por_pago`
`{ efectivo: { pedidos, monto }, tarjeta_tpv: {...}, ... }`.

### 5. `serie_diaria`
Array fecha-por-fecha. Días sin pedidos se rellenan con 0 (importante para gráficas tipo línea/área).

```json
[ {"fecha":"2026-05-12","pedidos":4,"ventas":520}, ... ]
```

Expresión de fecha cross-driver:
```php
$dateExpr = $driver === 'sqlite'
    ? "strftime('%Y-%m-%d', created_at)"
    : "DATE(created_at)";
```

### 6. `top_productos`
Top 10 por cantidad vendida — agrupa por `producto_nombre` (snapshot), no por `producto_id` (para que renombrar no funda dos productos).

```json
[ { "producto_nombre":"Taco al Pastor", "cantidad":120, "ingresos":3360, "pedidos":80 }, ... ]
```

## Optimización

Todo se calcula en **pocas queries agregadas**:
- 1 query para `resumen`.
- 1 query para `por_estado`.
- 1 query para `por_entrega`.
- 1 query para `por_pago`.
- 1 query para `serie_diaria`.
- 1 query para `top_productos`.
- 1 query para `compras`.
- 1 query para `bajo_stock`.

Total: ~8 queries aún en rangos grandes. No itera filas en PHP.

## Bajo stock — fuera del rango

`bajo_stock` es **snapshot actual** (ingredientes activos con `stock <= stock_minimo`). Tiene sentido: te interesa saber lo que tienes corto ahora, no lo que tuviste corto hace 3 semanas.

## Limitaciones

- **No granular por producto vs ingrediente**: el COGS (costo de bienes vendidos) real implicaría sumar el `costo_unitario × cantidad consumida` por pedido. Hoy se aproxima con `compras.total` del rango, lo cual mezcla compras no consumidas. Aceptable para una vista, no para contabilidad.
- **Sin breakdown por categoría** del top de productos.
- **Sin export CSV/PDF** desde el endpoint.
- **Sin métricas multi-local** (super_admin tendría que pegarle a la BD a mano).
- **Zona horaria**: usa `created_at` raw en BD, sin convertir a `local.zona_horaria` — los rangos por preset pueden tener un offset de hasta varias horas si el local está en otra TZ.

## Frontend

Página: `apps/web/src/app/admin/metricas/page.tsx`.

Hoy se renderiza con gráficas básicas; el backend ya entrega todo formateado.
