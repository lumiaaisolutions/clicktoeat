# Modelo — `Producto`

Fuente: `apps/api/app/Models/Producto.php`. Tabla: `productos`.

## Traits

- `BelongsToTenant`
- `HasFactory`
- `SoftDeletes`

## Fillable

```
local_id, categoria_id,
nombre, slug, descripcion,
precio, precio_descuento,
imagen_url, imagen_public_id,
disponible, es_combo, es_promocion,
tag, extras, meta, orden
```

## Casts

| Campo              | Cast      |
|--------------------|-----------|
| `precio`            | decimal:2  |
| `precio_descuento`  | decimal:2  |
| `disponible`        | boolean    |
| `es_combo`          | boolean    |
| `es_promocion`      | boolean    |
| `extras`            | array (JSON) |
| `meta`              | array      |

## Relaciones

| Método      | Tipo                | Notas                         |
|------------|---------------------|-------------------------------|
| `categoria()`| BelongsTo Categoria  |                               |
| `recetas()` | HasMany Receta       | Ingredientes/componentes      |
| `local()`   | BelongsTo Local       | Desde el trait                 |

## Constraint clave

UNIQUE `(local_id, slug)`.

## Estructura `extras` (JSON)

```json
[
  {
    "group": "Tortilla",
    "kind": "one",            // "one" = radio, "many" = checkbox
    "required": true,
    "items": [
      { "id": "maiz",   "name": "Maíz",   "price": 0 },
      { "id": "harina", "name": "Harina", "price": 5 }
    ]
  }
]
```

Validado en `Producto/StoreProductoRequest` y `UpdateProductoRequest`.

## Reglas de negocio

- `disponible=false` → no aparece en el menú público pero sigue existiendo (no se borra).
- `imagen_public_id` se usa para borrar la imagen del disco al reemplazarla o eliminar el producto. Hoy es la ruta relativa al disk `public` (no Cloudinary).
- `precio_descuento` debe ser `< precio` (validado `lt:precio` en store).
- `es_combo` / `es_promocion` son flags visuales; no implican lógica de inventario distinta — el descuento sigue siendo por receta.
- `orden` ordena ASC en el menú.

## Endpoints

`apiResource` + `extras` validados. Ver [`api/tenant.md`](../api/tenant.md#productos--apiresource).
