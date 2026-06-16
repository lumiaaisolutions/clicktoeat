# Recuperación de carrito abandonado

Cuando un cliente abre la landing pública, arma un carrito y deja su email pero NO envía el pedido, esperamos 60 minutos y si no apareció un pedido del mismo email + local, le mandamos un correo recordatorio.

## Tracking

`<LandingClient>` monta el hook `useTrackAbandonedCart`. Cada 30s, si:

- El email pasa validación regex.
- Hay ≥1 item en el carrito.

Hace `POST /public/carrito-abandonado/{slug}` con:
```json
{
  "email": "cliente@ejemplo.com",
  "cliente_nombre": "Juan",
  "items": [{"producto_id": 7, "nombre": "Taco al Pastor", "cantidad": 2, "precio": 28}],
  "total_estimado": 56
}
```

Backend hace `updateOrInsert` por `(local_id, email)` reseteando `recovered_at` y `notified_at`. Si el cliente sigue editando, va actualizando el `seen_at`.

## Despacho del email

Scheduler `everyFifteenMinutes()` corre `CarritoAbandonadoDispatcher::dispatchPending()`:

- Carritos con `seen_at` entre 60min y 24h.
- `notified_at IS NULL` (no enviado).
- `recovered_at IS NULL` (no convertido).
- Local con plan activo o `pago_externo`.
- **Doble check**: el email no debe tener un pedido en este local de las últimas 2h (por si el tracking quedó stuck pero el cliente ya compró).

Si pasa todo, manda `CarritoAbandonadoMail` y marca `notified_at = now()`.

## Marca como recovered

`OrderService::crear` actualiza `recovered_at = now()` para todos los carritos pendientes del mismo email + local.

## Modelo de datos

```sql
CREATE TABLE carritos_abandonados (
  id, local_id, email, cliente_nombre,
  items JSON,           -- [{producto_id, nombre, cantidad, precio}]
  total_estimado DECIMAL(10,2),
  seen_at      TIMESTAMP, -- última actividad del tracker
  recovered_at TIMESTAMP NULLABLE,  -- pedido creado
  notified_at  TIMESTAMP NULLABLE,  -- email enviado
  INDEX (local_id, email),
  INDEX (seen_at)
);
```

## Privacidad

- El email **del cliente final** se conserva sólo hasta que se recupera o pasan 24h sin actividad (el dispatcher ignora >24h).
- Si el cliente pide borrado via `/public/borrar-mis-datos`, sus carritos abandonados se borran inmediatamente.
- El owner no ve este flujo — es transparente para él, pero se nota como un aumento en conversión.

## Performance

- El endpoint público está throttled (30/min/IP).
- El cron es ligero: máx 200 carritos por ejecución.
- En MySQL, considerar índice compuesto adicional si la tabla crece >100K.
