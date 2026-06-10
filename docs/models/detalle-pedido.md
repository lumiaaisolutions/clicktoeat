# Modelo — `DetallePedido`

Fuente: `apps/api/app/Models/DetallePedido.php`. Tabla: `detalle_pedidos`.

## Rol

Una línea por producto pedido. **Conserva snapshot** de nombre y precio en el momento del pedido — sobrevive a cambios posteriores del producto.

## Fillable

```
pedido_id, producto_id,
producto_nombre, precio_unitario, cantidad, subtotal,
extras_seleccionados, notas
```

## Casts

| Campo                   | Cast        |
|------------------------|-------------|
| `precio_unitario`        | decimal:2    |
| `subtotal`               | decimal:2    |
| `cantidad`               | integer      |
| `extras_seleccionados`   | array (JSON)  |

## Relaciones

| Método     | Tipo                  | Notas                                       |
|-----------|------------------------|---------------------------------------------|
| `pedido()` | BelongsTo Pedido        |                                             |
| `producto()`| BelongsTo Producto     | Puede ser NULL si el producto se borró       |

## Estructura `extras_seleccionados`

```json
[
  { "group": "Tortilla", "item": "Harina",   "price": 5 },
  { "group": "Salsas",   "item": "Habanero", "price": 0 }
]
```

`precio_unitario` ya incluye los extras (`producto.precio + Σ extras.price`).

## Por qué snapshot

- Si el owner sube el precio del taco después, el pedido viejo sigue mostrando el precio cobrado.
- Si renombras el producto, el pedido sigue mostrando el nombre original.
- Si lo borras, el detalle sobrevive (FK `nullOnDelete`).

Esto vuelve **inmutable** el histórico de ventas sin necesidad de event sourcing.

## Sin tenant trait

`DetallePedido` no usa `BelongsToTenant`. Hereda el aislamiento de su `Pedido` padre (que sí está scopeado).
