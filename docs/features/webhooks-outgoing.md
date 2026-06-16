# Webhooks de salida (outgoing)

Cuando llega un pedido nuevo, ClickToEat hace `POST` a las URLs que el local haya configurado en `/admin/integraciones`. Útil para que un sistema de cocina, ERP o app propia reciba el pedido sin polling.

Sólo disponible en **plan Premium** (`feature: api_webhooks`).

## Configurar

`/admin/integraciones`:

1. Pega la URL HTTPS de tu endpoint.
2. Generamos un `secret` aleatorio que mostramos UNA VEZ — cópialo a tu sistema para verificar firma.
3. Cada vez que llegue un pedido te llamamos. Si fallas 10 veces seguidas, desactivamos el webhook.

## Formato del request

```http
POST /tu-endpoint HTTP/1.1
Content-Type: application/json
X-CTE-Event: pedido.creado
X-CTE-Signature: sha256=<hex hmac>
User-Agent: ClickToEat-Webhook/1.0

{
  "event":     "pedido.creado",
  "local_id":  42,
  "timestamp": "2026-06-15T22:33:00-06:00",
  "data": {
    "codigo":         "CE-ABC123",
    "cliente":        "Juan Pérez",
    "total":          245.50,
    "metodo_entrega": "delivery",
    "metodo_pago":    "efectivo",
    "estado":         "nuevo",
    "created_at":     "2026-06-15T22:33:00-06:00"
  }
}
```

## Verificación de firma

El header `X-CTE-Signature: sha256=<hex>` es HMAC-SHA256 del **body raw** con tu `secret`. Verifica así (pseudocódigo):

```php
$secret = '<el que te dimos>';
$body   = file_get_contents('php://input');
$expected = 'sha256='.hash_hmac('sha256', $body, $secret);
if (! hash_equals($expected, $_SERVER['HTTP_X_CTE_SIGNATURE'])) {
    http_response_code(401); exit;
}
```

```js
// Node
const expected = 'sha256=' + crypto
  .createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-cte-signature']))) {
  return res.status(401).send();
}
```

## Esperamos de tu endpoint

- **HTTP 2xx** dentro de 5 segundos. No leemos el body.
- 4xx/5xx incrementa `error_count`. Al llegar a 10, desactivamos el webhook.
- Si timeout (>5s): cuenta como error.
- **No reintenta automáticamente**. Si tu endpoint estaba caído cuando llegó un pedido, ese pedido no se vuelve a entregar. Si necesitas garantías, conecta también al polling del API (`GET /pedidos`).

## Eventos disponibles

| Event | Cuándo se dispara |
|---|---|
| `pedido.creado` | Cuando se crea un pedido (público o POS) y la transacción se commitea. |

(Otros eventos se irán agregando: `pedido.entregado`, `pedido.cancelado`, etc.)

## Modelo de datos

### Tabla `outgoing_webhooks`

```sql
id, local_id, event, url, secret, active,
last_called_at, last_status, last_error, error_count,
created_at, updated_at
INDEX (local_id, event, active)
```

### Servicio

`App\Services\Webhooks\OutgoingWebhookDispatcher::dispatch($localId, $event, $payload)` — síncrono, sin queue. Llamado desde `OrderService::crear` cuando el local tiene `feature: api_webhooks`.

> Sin worker async en Hostinger CageFS, el dispatch es inline en el request. Para volúmenes >100 pedidos/min mover a un job + Redis queue.
