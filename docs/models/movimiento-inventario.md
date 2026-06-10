# Modelo — `MovimientoInventario`

Fuente: `apps/api/app/Models/MovimientoInventario.php`. Tabla: `movimientos_inventario`.

## Rol

Auditoría de cambios de stock. Una fila por evento que modifica un ingrediente.

## Traits

- `BelongsToTenant`
- `HasFactory`

## Fillable

```
local_id, ingrediente_id, tipo, cantidad,
stock_resultante, referencia, motivo, user_id
```

## Casts

| Campo            | Cast      |
|------------------|-----------|
| `cantidad`        | decimal:3  |
| `stock_resultante`| decimal:3  |

## Relaciones

| Método        | Tipo                  | Notas                                     |
|--------------|-----------------------|-------------------------------------------|
| `ingrediente()`| BelongsTo Ingrediente  |                                           |
| `usuario()`   | BelongsTo User         | Por `user_id` (NULL si automático)         |
| `local()`     | BelongsTo Local         | Desde el trait                             |

## Tipos

Enum: `entrada`, `salida`, `ajuste`, `merma`. Ver [`features/inventario.md`](../features/inventario.md#tipos-de-movimiento).

## Patrón `referencia`

String que codifica el origen. Patrones canónicos:

| Valor                  | Significado                       |
|-----------------------|-----------------------------------|
| `alta`                 | Stock inicial al crear ingrediente |
| `manual`               | Ajuste manual desde panel          |
| `pedido:{N}`           | Salida por pedido N                 |
| `pedido:{N}:reintegro` | Entrada al cancelar pedido N         |
| `compra:{N}`           | Entrada por compra N                 |
| `compra:{N}:anulacion` | Salida por anulación de compra N    |

→ Idempotencia y trazabilidad sin tabla polimórfica.

## `stock_resultante`

Captura el stock **después** del movimiento. Permite reconstruir el balance sin recalcular toda la historia.

## Listado

`GET /api/v1/ingredientes/{id}/movimientos` con filtros `?tipo=&desde=&hasta=&per_page=`.

Ordenado `created_at DESC, id DESC`.

## Reglas

- Nunca debe editarse — es un log inmutable. (No hay endpoint de update.)
- Borrar el ingrediente cascadea (se pierde historia).
- Sin `cantidad=0` (no representa nada).
