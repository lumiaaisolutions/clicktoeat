# Feature — Notificaciones in-app

## Modelo

Tabla `notificaciones` (ver [`database/schema.md`](../database/schema.md)). Una fila por evento dirigido al local. Sin destinatario específico (todos los usuarios del local ven las mismas).

```
{
  id, local_id, tipo, titulo, mensaje, data (JSON), leida_at, created_at
}
```

## Tipos definidos

| Tipo          | Cuándo                                                   | Datos                                                |
|--------------|----------------------------------------------------------|------------------------------------------------------|
| `bajo_stock` | Un ingrediente cruzó (no estaba bajo, ahora sí) el `stock_minimo` | `{ ingrediente_id, stock, stock_minimo, unidad }` |

Hoy es el único tipo emitido. Pendientes:
- `pedido_nuevo` (cuando llega pedido público nuevo).
- `pedido_cancelado` (el cliente canceló o lo cancelaron por timeout).
- `compra_anulada`, `stock_critico` (0 unidades).

## Emisión

Backend, dentro de `InventoryService::descontarParaPedido`:

```php
if ($stockAntes > $umbral && $nuevoStock <= $umbral) {
    $this->notificarBajoStock($pedido->local_id, $ing);
}
```

`notificarBajoStock`:
- Deduplica: si ya hay una notificación no leída del mismo `ingrediente_id`, no crea otra.
- Si no, crea fila con `tipo='bajo_stock'`, datos del ingrediente, mensaje en español.

## Endpoints (tenant-scoped)

| Método | Ruta                                            | Acción                                          |
|-------|--------------------------------------------------|-------------------------------------------------|
| GET   | `/notificaciones?solo_no_leidas=`                | Últimas 100 + count + pedidos activos            |
| POST  | `/notificaciones/leer-todas`                      | Marca todas no-leídas como leídas                 |
| POST  | `/notificaciones/{id}/leer`                       | Marca una como leída                              |

GET respuesta:
```json
{
  "data": [
    { "id":1,"tipo":"bajo_stock","titulo":"...","mensaje":"...","data":{...},"leida":false,"leida_at":null,"created_at":"..." }
  ],
  "no_leidas": 3,
  "pedidos_activos": [
    /* PedidoResource[] en estado nuevo|confirmado|preparando|listo */
  ]
}
```

Por qué viene `pedidos_activos` junto: el frontend muestra un "campanita" que combina notificaciones + bandeja de pedidos pendientes en una sola fuente de verdad.

## Frontend

### Store
`apps/web/src/store/notificaciones.ts` (Zustand).

Estado:
- `items`, `noLeidas`, `pedidosNuevos` (filtrado a `estado === 'nuevo'` para alertar al cajero).
- `pollHandle` para gestionar el intervalo.

Acciones:
- `refresh()` — GET `/notificaciones`.
- `marcarLeida(id)` — POST + update optimista.
- `marcarTodasLeidas()`.
- `startPolling()` — invoca `refresh()` inmediato y luego cada **30 segundos**.
- `stopPolling()` — clear interval.

### Componente
`apps/web/src/components/admin/NotificacionesBell.tsx` — campanita con contador `noLeidas`, dropdown con la lista, badge separado para pedidos nuevos.

### Cuándo arranca el polling
Se inicia desde el `apps/web/src/app/admin/layout.tsx` cuando el user está autenticado.

## Pendiente: tiempo real

Hoy es **polling cada 30s**. La latencia para que el owner vea un pedido nuevo es 0-30s. Soluciones futuras:

1. **Pusher / Laravel Reverb** (broadcasting nativo).
2. **Server-Sent Events** (sse) — más simple, suficiente porque sólo el server emite.
3. **WebSocket directo** sobre WS gateway.

Cualquiera requiere:
- `BROADCAST_CONNECTION=pusher|reverb` en `.env`.
- Frontend con cliente Pusher/Echo.
- Auth de canal privado por local (`Channel::routes()`).
- Disparo desde `OrderService::crear` después de la transacción.

Ver fase 6 del [`issues/roadmap.md`](../issues/roadmap.md).

## Limitaciones

- **Sin destinatario específico**: todos los usuarios del local ven todas. Si tu negocio quiere que el cocinero vea bajo_stock y el cajero vea pedidos nuevos, hace falta un campo `user_id`/`rol`.
- **Sin push notifications móviles** (no hay PWA + service worker para mostrar notif del SO).
- **Sin canal de email** para urgencias.
- **`leerTodas`** marca todas — sin filtro por tipo.
