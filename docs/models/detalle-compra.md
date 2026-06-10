# Modelo — `DetalleCompra`

Fuente: `apps/api/app/Models/DetalleCompra.php`. Tabla: `detalle_compras`.

## Rol

Línea de una compra: qué ingrediente se recibió, en qué cantidad, a qué costo.

## Fillable

```
compra_id, ingrediente_id, cantidad, costo_unitario, subtotal
```

## Casts

| Campo            | Cast      |
|------------------|-----------|
| `cantidad`        | decimal:3  |
| `costo_unitario`  | decimal:2  |
| `subtotal`        | decimal:2  |

## Relaciones

| Método       | Tipo                  |
|-------------|-----------------------|
| `compra()`    | BelongsTo Compra        |
| `ingrediente()`| BelongsTo Ingrediente   |

## Notas

- `subtotal = cantidad × costo_unitario` (calculado en backend, persistido para reportes rápidos).
- No usa `BelongsToTenant` — hereda aislamiento del `Compra` padre.
- Sin soft delete (cascadea al borrar compra).
