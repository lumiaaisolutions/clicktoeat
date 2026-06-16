# Feature — Pedido programado

> El cliente puede pedir para una hora futura (recoger a las 19:00) en
> lugar de "lo antes posible". Útil para horas pico, pedidos para
> reuniones, etc.

## Modelo

Columna `pedidos.programado_para timestamp NULL`.

## Validación

`StorePublicPedidoRequest`:
```
'programado_para' => ['nullable', 'date', 'after:now', 'before:+72 hours']
```

- Mínimo 30 min en el futuro (UI lo enforce; backend tolera + flexible).
- Máximo 72h hacia adelante (3 días). Más allá no aporta UX y abre puerta a abuso.

> **TODO**: validar que `programado_para` cae dentro de horario de
> atención del local. Hoy NO se valida — un pedido programado para
> domingo 4am pasaría. Mejorar en F37.

## UI

`LandingClient.CheckoutSheet` muestra link "Para más tarde" debajo del
método de pago. Al click, aparece `<input type="datetime-local">` con
`min` y `max` ya calculados.

## Admin

`PedidoResource` expone `programado_para` ISO 8601. En `/admin/pedidos`:

- **Pendiente F37**: badge "Programado · HH:mm" naranja en cada row.
- **Pendiente F37**: ordenar pedidos programados al inicio cuando estén
  ≤30 min de su hora.
- **Pendiente F37**: filtro "Solo programados".

## Cómo aparece en el WhatsApp

`WhatsAppLinkBuilder` debe incluir la hora si está programado:

> "Pedido CE-XYZ — Programado para hoy 19:00"

**Pendiente F37**: actualizar `WhatsAppLinkBuilder::format()`.

## Ver también
- [`cupones.md`](cupones.md)
- [`pedidos.md`](pedidos.md)
