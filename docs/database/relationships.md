# Base de datos — Relaciones y FKs

Inventario de claves foráneas (extraído de migraciones y modelos).

## Diagrama de FKs (texto)

```
users ───────────────┐                          
  (super_admin sin   │                          
   local_id)         │                          
                     ▼                          
                  locales ◄────── (owner_id) ──┐
                     │                          │
        ┌────────────┼────────────┐             │
        ▼            ▼            ▼             │
   categorias   ingredientes   pedidos          │
        │            │            │             │
        ▼            ▼            ▼             │
   productos     mov_inv      detalle_pedidos   │
        │            ▲            │             │
        │            │            ▼             │
        ▼            │         productos        │
   recetas ─── (ingrediente_id) ──┘             │
        │                                       │
        ▼                                       │
    productos (componente_producto_id)          │
                                                │
   compras ── (local_id) ───────────────────────┤
        │                                       │
        ▼                                       │
   detalle_compras ── (ingrediente_id) ─► ingredientes
                                                │
   notificaciones ── (local_id) ───────────────►
```

## Tabla → FK → referencia

| Tabla origen           | Columna                   | Referencia                | On delete   |
|-----------------------|---------------------------|---------------------------|-------------|
| `users`                | `local_id`                 | `locales.id`              | SET NULL    |
| `locales`              | `owner_id`                 | `users.id`                | SET NULL    |
| `categorias`           | `local_id`                 | `locales.id`              | CASCADE     |
| `productos`            | `local_id`                 | `locales.id`              | CASCADE     |
| `productos`            | `categoria_id`             | `categorias.id`           | CASCADE     |
| `ingredientes`         | `local_id`                 | `locales.id`              | CASCADE     |
| `recetas`              | `producto_id`              | `productos.id`            | CASCADE     |
| `recetas`              | `ingrediente_id` (null)    | `ingredientes.id`         | CASCADE     |
| `recetas`              | `componente_producto_id` (null) | `productos.id`       | CASCADE     |
| `pedidos`              | `local_id`                 | `locales.id`              | CASCADE     |
| `detalle_pedidos`      | `pedido_id`                | `pedidos.id`              | CASCADE     |
| `detalle_pedidos`      | `producto_id` (null)       | `productos.id`            | SET NULL    |
| `movimientos_inventario` | `local_id`               | `locales.id`              | CASCADE     |
| `movimientos_inventario` | `ingrediente_id`         | `ingredientes.id`         | CASCADE     |
| `movimientos_inventario` | `user_id` (null)         | `users.id`                | SET NULL    |
| `compras`              | `local_id`                 | `locales.id`              | CASCADE     |
| `compras`              | `user_id` (null)           | `users.id`                | SET NULL    |
| `detalle_compras`      | `compra_id`                | `compras.id`              | CASCADE     |
| `detalle_compras`      | `ingrediente_id`           | `ingredientes.id`         | CASCADE     |
| `notificaciones`       | `local_id`                 | `locales.id`              | CASCADE     |

## Comportamiento al borrar

### Eliminar un `Local` (hard delete — soft delete es lo normal)
Cascadea: `categorias`, `productos`, `ingredientes`, `pedidos`, `movimientos_inventario`, `compras`, `notificaciones`. `users.local_id` queda NULL.

### Eliminar un `Producto` (hard delete)
Cascadea: `recetas` (donde aparece como producto o como componente). `detalle_pedidos.producto_id` queda NULL (el pedido sigue vivo gracias al snapshot de `producto_nombre`).

### Eliminar un `Ingrediente` (hard delete)
Cascadea: `recetas`, `movimientos_inventario`, `detalle_compras`. El controller bloquea (409) si tiene recetas asociadas.

### Eliminar una `Categoria` (hard delete)
Cascadea: `productos`. El controller bloquea (409) si tiene productos.

### Soft delete vs hard delete

| Tabla       | Estrategia                                           |
|-------------|------------------------------------------------------|
| `users`      | SoftDelete                                           |
| `locales`    | SoftDelete                                           |
| `productos`  | SoftDelete                                           |
| `pedidos`    | SoftDelete                                           |
| `compras`    | SoftDelete                                           |
| Resto        | Hard delete (`ingredientes` y `categorias` bloqueados por controller si tienen dependencias) |

## Índices secundarios destacados

- `(local_id, slug)` UNIQUE en `categorias` y `productos` → slugs únicos por tenant.
- `(local_id, categoria_id, disponible)` en `productos` → cubre el filtrado del menú público.
- `(local_id, estado, created_at)` en `pedidos` → cubre listas paginadas por estado.
- `(local_id, ingrediente_id, created_at)` en `movimientos_inventario` → historial de un ingrediente.
- `(local_id, leida_at, created_at)` en `notificaciones` → no-leídas primero.

## Anomalías conocidas

1. La regla "una receta es ingrediente XOR componente" no tiene CHECK en BD — depende del validator. Si alguien hace un INSERT raw con ambos campos, MySQL lo acepta. **Pendiente:** convertir en CHECK constraint.
2. `pedidos.metodo_entrega` y `pedidos.metodo_pago` son enums extendidos en `2024_02_01` — si el driver es sqlite (tests) las columnas son strings y la migración no hace nada (es idempotente cross-driver).
3. `users.local_id` no tiene constraint compuesto con `rol`: un super_admin "podría" tener `local_id` no-NULL. El middleware lo ignora, pero no hay protección a nivel BD.
