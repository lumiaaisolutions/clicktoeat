# Modelo — `Pedido`

Fuente: `apps/api/app/Models/Pedido.php`. Tabla: `pedidos`.

## Traits

- `BelongsToTenant`
- `HasFactory`
- `SoftDeletes`

## Fillable

```
codigo, local_id,
cliente_nombre, cliente_telefono, direccion, notas,
metodo_entrega, metodo_pago,
subtotal, delivery_fee, descuento, total,
estado, whatsapp_url,
confirmado_at, entregado_at
```

## Casts

| Campo            | Cast      |
|-----------------|-----------|
| `subtotal`        | decimal:2  |
| `delivery_fee`    | decimal:2  |
| `descuento`       | decimal:2  |
| `total`           | decimal:2  |
| `confirmado_at`   | datetime   |
| `entregado_at`    | datetime   |

## Hooks

```php
static::creating(function (Pedido $pedido) {
    if (! $pedido->codigo) {
        $pedido->codigo = 'CE-'.strtoupper(Str::random(6));
    }
});
```

Genera código único al crear si no se pasó.

## Relaciones

| Método      | Tipo                | Notas                  |
|------------|---------------------|------------------------|
| `detalles()`| HasMany DetallePedido|                        |
| `local()`   | BelongsTo Local      | Desde el trait          |

## Estados

Enum: `nuevo`, `confirmado`, `preparando`, `listo`, `en_camino`, `entregado`, `cancelado`.

Ver máquina de estados en [`features/pedidos.md`](../features/pedidos.md#máquina-de-estados).

## Métodos de entrega

`pickup`, `delivery`, `sucursal` (este último sólo desde POS interno).

## Métodos de pago

`efectivo`, `tarjeta_entrega`, `tarjeta_tpv` (sólo POS), `transferencia`.

## Constraint clave

UNIQUE `codigo`. Estructura `CE-XXXXXX` (8 chars total).

## Reglas de negocio

- `whatsapp_url` se llena cuando el pedido se crea con entrega != `sucursal`.
- `confirmado_at` / `entregado_at` se llenan automáticamente al transicionar de estado (`PedidoController::updateEstado`).
- Cancelar (a `cancelado`) desde un estado activo → reintegro de inventario (`InventoryService::reintegrarParaPedido`).
- Soft delete no reintegra inventario (es ruido, no cancelación).
- `descuento` siempre `0` por ahora (cupones pendientes).

## Endpoints

Ver [`api/tenant.md`](../api/tenant.md#pedidos-admin-del-local) y [`api/public.md`](../api/public.md#post-publicpedidosslug).
