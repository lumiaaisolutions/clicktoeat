# Feature — Recetas

## Qué es una receta

Una receta liga un **producto vendible** con lo que consume cuando se vende. Cada fila en `recetas` apunta a:
- **Un ingrediente** (`ingrediente_id`) → al pedir 1× producto, descontar `cantidad` × multiplicador.
- **O un producto componente** (`componente_producto_id`) → "este producto está compuesto por otro producto" (combo, plato armado).

Una fila es **ingrediente XOR componente**, nunca ambos. Enforzado por `SyncRecetaRequest`.

## Tabla

`recetas` (ver [`database/schema.md`](../database/schema.md)):

| Columna                   | Tipo                              |
|---------------------------|-----------------------------------|
| `id`                       | bigint PK                          |
| `producto_id`              | bigint FK→productos (cascade)      |
| `ingrediente_id`           | bigint FK→ingredientes nullable    |
| `componente_producto_id`   | bigint FK→productos nullable        |
| `cantidad`                 | decimal(12,3)                      |

Constraints únicos:
- `(producto_id, ingrediente_id)` UNIQUE
- `(producto_id, componente_producto_id)` UNIQUE

## Productos compuestos

Ejemplo: "Combo familiar" tiene en su receta `1× Mix de frutas`. "Mix de frutas" es otro producto con su propia receta (`0.3 kg fresa + 0.3 kg uva + 0.2 kg durazno + 0.1 l chantilly`).

Cuando un cliente pide 2× Combo familiar, `InventoryService` expande recursivamente:
- 2× Combo → 2× Mix de frutas → `0.6 kg fresa + 0.6 kg uva + 0.4 kg durazno + 0.2 l chantilly`.

### Detección de ciclos

Si un producto A es componente de B y B es componente de A → `RuntimeException("Ciclo detectado en receta del producto X...")`.

Implementación: `InventoryService::expandirProducto` lleva un set `$visitados` por cadena de llamadas.

## Endpoints

| Método | Ruta                                      | Acción                                            |
|-------|-------------------------------------------|---------------------------------------------------|
| GET   | `/productos/{producto}/recetas`            | lista la receta actual                            |
| PUT   | `/productos/{producto}/recetas`            | **sync** completo (idempotente, reemplaza)         |
| DELETE| `/recetas/{receta}`                        | borra una entrada específica                       |

PUT body:
```json
{
  "recetas": [
    { "ingrediente_id": 5,            "cantidad": 0.05 },
    { "ingrediente_id": 7,            "cantidad": 2 },
    { "componente_producto_id": 12,    "cantidad": 1 }
  ]
}
```

### Por qué PUT en lugar de POST/PATCH

Cuando editas la receta de un producto desde la UI, lo natural es ver toda la lista y darle "Guardar". PUT con el array completo:
- **Idempotente** (mismo body = mismo estado).
- Evita el ciclo manual `borrar todas + insertar nuevas + manejo de errores parciales`.

Detrás: la implementación borra todas las recetas del producto y vuelve a insertar las del body. Dedupe ingrediente y componente por separado.

## Validación

`SyncRecetaRequest`:
- `ingrediente_id` y `componente_producto_id` son `required_without` entre sí.
- `cantidad >= 0.001` (no permite 0 — sería receta inerte).
- `ingrediente_id` debe existir Y pertenecer al mismo local (`exists ingredientes.local_id`).
- `componente_producto_id` debe existir Y pertenecer al local Y no ser el mismo producto.

## Casos límite

- **Producto sin receta**: no consume nada → un pedido pasa sin tocar inventario. Es el comportamiento correcto para combos abstractos o productos sin "materia prima" controlada.
- **Componente sin receta**: si A→B y B no tiene receta, B no consume. Útil para "marker products" (placeholders).
- **Cambiar la receta no afecta pedidos viejos** — el descuento ya se hizo en su momento.

## Política de autorización

`RecetaPolicy::before` → super_admin pasa. Después:
- `viewAny(user, producto)`: user del mismo local del producto.
- `manage(user, producto)`: **sólo owner** del local.
- `delete(user, receta)`: sólo owner del local del producto padre.

`SyncRecetaRequest::authorize()` reutiliza `ProductoPolicy::update` → editar receta requiere el mismo nivel que editar el producto.

## Frontend

Editor visual: `apps/web/src/app/admin/inventario/[id]/` o `apps/web/src/app/admin/productos/page.tsx` (depende de cómo se exponga).
