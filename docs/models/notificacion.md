# Modelo — `Notificacion`

Fuente: `apps/api/app/Models/Notificacion.php`. Tabla: `notificaciones`.

## Traits

- `BelongsToTenant`
- `HasFactory`

## Fillable

```
local_id, tipo, titulo, mensaje, data, leida_at
```

## Casts

| Campo      | Cast        |
|-----------|-------------|
| `data`     | array (JSON)  |
| `leida_at` | datetime     |

## Scopes

- `scopeNoLeidas($q)` → `whereNull('leida_at')`.

## Métodos

- `marcarLeida(): void` — setea `leida_at = now()` si aún era null.

## Tipos definidos

Hoy sólo `bajo_stock` (creada por `InventoryService` al cruzar el umbral). Otros tipos pendientes — ver [`features/notificaciones.md`](../features/notificaciones.md).

## Sin destinatario

No tiene `user_id` — todos los usuarios del local ven la misma. Para destinar a roles específicos, agregar campo.

## Ver más

- [`features/notificaciones.md`](../features/notificaciones.md) — emisión, deduplicación, polling cada 30s.
- [`api/tenant.md`](../api/tenant.md#notificaciones) — endpoints.
