# Auto-pause de productos sin stock + notificación

Cuando un ingrediente se agota (stock <= 0), los productos que lo usan
se marcan automáticamente como `disponible = false` en la landing pública
para evitar que clientes pidan algo imposible de preparar.

## Comportamiento

Triggered en `InventoryService::descontarParaPedido()`:

1. **Bajo stock**: cuando un ingrediente cruza el umbral `stock_minimo`
   pero todavía hay stock disponible:
   - Notificación in-app (`tipo=bajo_stock`)
   - Email al owner con asunto "🟡 Bajo stock: {nombre}"
   - Anti-spam: máx 1 email/día por ingrediente (registrado en
     `stock_alerts_sent` table)

2. **Agotado**: cuando el ingrediente llega a stock <= 0:
   - Notificación in-app (`tipo=auto_pause`)
   - Email al owner con asunto "🔴 Se agotó {nombre} en {local}"
   - **Productos afectados marcados `disponible = false`** automáticamente
   - Anti-spam igual al bajo_stock

## Cómo reactivar productos

Cuando el owner reponga el stock del ingrediente (compra al proveedor),
debe entrar a `/admin/productos` y reactivarlos manualmente. Esto es
intencional: el sistema no sabe si lo que se compró es la cantidad
suficiente para todos los productos que dependen de ese ingrediente.

**Mejora futura**: ofrecer un botón "Reactivar todos los productos que
estaban pausados por este ingrediente" cuando el stock vuelva sobre el
umbral.

## Modelo

`stock_alerts_sent` (nueva, F100):

```
id, local_id, ingrediente_id (FK nullable), tipo (bajo_stock|agotado),
sent_at (timestamp), unique index (local_id, ingrediente_id, tipo, sent_at)
```

## Plan gating

Solo en planes **Profesional** y **Premium** (feature `auto_pause_stock`).
Locales en Esencial reciben la notificación de bajo stock pero NO el auto-pause.
