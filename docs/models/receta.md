# Modelo — `Receta`

Fuente: `apps/api/app/Models/Receta.php`. Tabla: `recetas`.

## Rol

Vincula un producto con lo que consume al venderse: un ingrediente físico O un producto componente (combo).

## Traits

- `HasFactory` (sin `BelongsToTenant` — hereda aislamiento via `producto_id`).

## Fillable

```
producto_id, ingrediente_id, componente_producto_id, cantidad
```

## Casts

| Campo      | Cast      |
|-----------|-----------|
| `cantidad`  | decimal:3  |

## Relaciones

| Método         | Tipo                        | Notas                                              |
|---------------|-----------------------------|----------------------------------------------------|
| `producto()`    | BelongsTo Producto           |                                                    |
| `ingrediente()` | BelongsTo Ingrediente         | NULL si la fila es componente                       |
| `componente()`  | BelongsTo Producto             | Por `componente_producto_id` — NULL si la fila es ingrediente |

## Helpers

- `esComponente(): bool` → `componente_producto_id !== null`.

## Constraint XOR

Cada fila usa **ingrediente_id O componente_producto_id**, nunca ambos. Enforzado por validación, no por CHECK constraint en BD (pendiente).

## Constraints únicos en BD

- UNIQUE `(producto_id, ingrediente_id)`
- UNIQUE `(producto_id, componente_producto_id)`

→ no puedes tener dos filas para el mismo `(producto, ingrediente)`. Si quieres "tortilla 1× y aparte tortilla 1× para algo distinto", suma a 2 en una sola fila.

## Cascadas

Borrar el producto, el ingrediente o el producto componente → cascadea borrar la receta.

## Ver más

- [`features/recetas.md`](../features/recetas.md) — flujo de expansión recursiva y detección de ciclos.
- [`features/inventario.md`](../features/inventario.md) — cómo se usa al descontar pedidos.
