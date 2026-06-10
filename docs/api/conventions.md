# API — Convenciones de respuesta

## Estructura de respuesta

### Recurso único

```json
{
  "data": { ... }
}
```

Devuelto por casi todos los endpoints `show`, `update`, `store`.

### Colección no paginada

```json
{
  "data": [ ... ]
}
```

Usado en listas pequeñas (ej. `/categorias`, `/ingredientes`, `/admin/locales`).

### Colección paginada (Laravel resource paginator)

```json
{
  "data": [ ... ],
  "links": {
    "first": "...",
    "last":  "...",
    "prev":  null,
    "next":  "..."
  },
  "meta": {
    "current_page": 1,
    "from":         1,
    "last_page":    5,
    "per_page":     20,
    "to":           20,
    "total":        100,
    "path":         "..."
  }
}
```

Usado en `/productos`, `/pedidos`, `/compras`, `/ingredientes/{id}/movimientos`.

Parámetros comunes:
- `?per_page=N` (máximo 100, default 20-30 según endpoint)
- `?page=N`

### Respuestas vacías

`204 No Content` con cuerpo vacío — para `DELETE`, `logout`, etc.

## Estilo de campos

Tres convenciones conviven, intencionalmente:

### snake_case (la mayoría)

Todos los Resources internos (`PedidoResource`, `ProductoResource`, `LocalResource`, ...).

```json
{ "cliente_nombre": "...", "metodo_entrega": "pickup", "delivery_fee": 25 }
```

### camelCase (Menú público)

`/public/menu/{slug}` y `MenuResource` del directorio usan camelCase para evitar transformación en el frontend:

```json
{ "colorPrimario": "...", "metodosPago": [...], "deliveryFee": 25 }
```

### Diferencias específicas

| Concepto                  | Snake (interno)         | Camel (público)      |
|---------------------------|-------------------------|----------------------|
| Color primario             | `color_primario`         | `colorPrimario`       |
| Tarifa delivery            | `delivery_fee`           | `deliveryFee`         |
| Métodos de pago            | `metodos_pago`           | `metodosPago`         |
| Imagen pública             | `imagen_url`             | `imagen` (más corto)  |

> **Pendiente arquitectónico:** unificar a una sola convención. Por ahora: respetar la existente al modificar cada endpoint.

## Filtros estándar

| Query param            | Aplica a                       | Comportamiento                       |
|-----------------------|--------------------------------|--------------------------------------|
| `q`                    | productos, locales (admin)     | LIKE en `nombre` (y `slug` en admin) |
| `estado`               | pedidos, compras, admin locales | filtra por enum                       |
| `desde` / `hasta`      | compras, movimientos, métricas  | YYYY-MM-DD                            |
| `categoria_id`         | productos                       | filtra por categoría                  |
| `disponible`           | productos                       | boolean                                |
| `activo`               | categorias                      | boolean                                |
| `bajo_stock`           | ingredientes                    | boolean → `stock <= stock_minimo`     |
| `solo_no_leidas`       | notificaciones                  | boolean                                |
| `tipo`                 | movimientos                     | enum entrada/salida/ajuste/merma      |
| `preset`               | métricas                        | `hoy`, `ayer`, `7d`, `30d`, `mes`      |

## Slugs

- Auto-generados con `Str::slug(nombre)` si no se proporcionan (categorías, productos, locales).
- Validación: regex `^[a-z0-9-]+$` para locales.
- Únicos por tenant (`(local_id, slug)`).

## Códigos legibles

| Recurso    | Formato           | Generado por                          |
|-----------|-------------------|---------------------------------------|
| Pedido    | `CE-XXXXXX`       | `Pedido::booted()` (Str::random(6) upper) |
| Compra    | `CP-XXXXXX`       | `Compra::booted()`                     |

## Soft delete

DELETE devuelve `204` y marca `deleted_at`. No hay endpoint de "restore" hoy (queda como pendiente — ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md)).

## Idempotencia

- `PUT /productos/{id}/recetas` (sync) → reemplaza la receta completa.
- Reset de stock (`pedido:N:reintegro`) → idempotente vía existencia de movimiento con esa referencia.
- Anulación de compra → idempotente si ya está `anulada`.

**No idempotente** (cuidado):
- `POST /public/pedidos/{slug}` — un reintento crea un pedido nuevo. Falta `Idempotency-Key`. Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md).
