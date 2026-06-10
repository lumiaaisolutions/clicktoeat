# Modelo — `Categoria`

Fuente: `apps/api/app/Models/Categoria.php`. Tabla: `categorias`.

## Traits

- `BelongsToTenant` → scope automático por `local_id`.
- `HasFactory`.

## Fillable

```
local_id, nombre, slug, icono, orden, activo
```

## Casts

| Campo    | Cast    |
|---------|---------|
| `activo` | boolean  |
| `orden`  | integer  |

## Relaciones

| Método      | Tipo           |
|------------|----------------|
| `productos()` | HasMany Producto |
| `local()`    | BelongsTo Local  | ← desde el trait

## Constraint clave

UNIQUE `(local_id, slug)` → cada local tiene sus propios slugs sin colisión cross-tenant.

## Reglas de negocio

- **Soft delete**: NO (hard delete).
- Borrar una categoría con productos asociados → controller bloquea con **409** ("Reasígnalos primero"). FK `cascadeOnDelete` haría borrar los productos si se forzara desde BD.
- `activo=false` no aparece en el menú público.
- `orden` ordena ASC en `MenuController::show`.

## Endpoints

`apiResource` en `routes/api.php`. Ver [`api/tenant.md`](../api/tenant.md#categorías--apiresource).
