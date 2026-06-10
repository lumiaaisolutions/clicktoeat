# Modelo — `Ingrediente`

Fuente: `apps/api/app/Models/Ingrediente.php`. Tabla: `ingredientes`.

## Traits

- `BelongsToTenant`
- `HasFactory`
- ❌ NO usa `SoftDeletes` (un ingrediente eliminado debería cascadear; usa `activo=false` para "ocultar")

## Fillable

```
local_id, nombre, stock, stock_minimo,
unidad, costo_unitario, activo
```

## Casts

| Campo            | Cast      |
|------------------|-----------|
| `stock`           | decimal:3 |
| `stock_minimo`    | decimal:3 |
| `costo_unitario`  | decimal:2 |
| `activo`           | boolean   |

## Relaciones

| Método       | Tipo                       |
|-------------|----------------------------|
| `recetas()`  | HasMany Receta              |
| `movimientos()`| HasMany MovimientoInventario |
| `local()`     | BelongsTo Local              | desde el trait

## Unidades válidas

`pz`, `kg`, `g`, `l`, `ml`. Validado en `Store/UpdateIngredienteRequest`. No hay conversión automática entre unidades; cada ingrediente vive en su propia escala.

## Reglas de negocio

- `stock` nunca baja de 0 (clampeado en `ajustar()` con `max(0, ...)`).
- `costo_unitario` se actualiza con **promedio ponderado** al registrar compras (ver [`features/compras.md`](../features/compras.md)).
- `activo=false` debería ocultarlo del POS / panel — el backend hoy no filtra automáticamente por este flag (es para la UI).
- Borrar un ingrediente con recetas → controller bloquea con 409.

## Vista derivada

`IngredienteResource` agrega:
- `bajo_stock`: bool `stock <= stock_minimo`.
- `recetas_count`: int (sólo si se cargó con `withCount`).

## Endpoints

Ver [`api/tenant.md`](../api/tenant.md#ingredientes--apiresource--ajustes).
