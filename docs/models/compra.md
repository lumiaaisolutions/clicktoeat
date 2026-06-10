# Modelo — `Compra`

Fuente: `apps/api/app/Models/Compra.php`. Tabla: `compras`.

## Traits

- `BelongsToTenant`
- `HasFactory`
- `SoftDeletes`

## Fillable

```
codigo, local_id, proveedor, referencia_factura, fecha,
subtotal, impuestos, total, notas, estado, user_id
```

## Casts

| Campo      | Cast      |
|-----------|-----------|
| `fecha`    | date       |
| `subtotal` | decimal:2  |
| `impuestos`| decimal:2  |
| `total`    | decimal:2  |

## Hooks

```php
static::creating(function (self $c) {
    if (! $c->codigo) $c->codigo = 'CP-'.strtoupper(Str::random(6));
});
```

Genera código legible.

## Relaciones

| Método     | Tipo              |
|-----------|-------------------|
| `detalles()`| HasMany DetalleCompra |
| `usuario()` | BelongsTo User (por `user_id`) |

## Estados

Enum: `registrada`, `anulada`.

- Registrada al crear → impacta stock + costo promedio.
- Anulada → marca + revierte stock (si es reversible).

## Ver más

- [`features/compras.md`](../features/compras.md) — flujo completo: registro, anulación, promedio ponderado.
- [`api/tenant.md`](../api/tenant.md#compras).
