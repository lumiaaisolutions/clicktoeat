# Feature — Integración con WhatsApp

## Modelo

ClickToEat **no usa la WhatsApp Business API**. Sólo genera deep-links `wa.me/<phone>?text=<msg-urlencoded>` que el cliente abre desde su navegador / móvil, y reenvía manualmente al WhatsApp del local.

Ventajas:
- Costo cero (sin meta API, sin BSP).
- El número de WhatsApp del local sigue siendo personal.

Desventajas:
- El servidor **no sabe** si el cliente realmente envió el mensaje.
- El estado del pedido depende del flujo manual del owner (recibe en su WhatsApp, lo confirma desde el panel).

## Implementación

### Backend
`App\Services\WhatsApp\WhatsAppLinkBuilder::buildForPedido(Pedido $pedido): string`

Construye un mensaje multi-línea con:
- Saludo personalizado: `Hola {local.nombre}, quiero pedir:`
- Items: `• {cantidad}× {producto_nombre} — ${subtotal}` + extras (`↳ {group}: {item}`).
- Totales: subtotal, envío (sólo si > 0), total.
- Datos del cliente: nombre, teléfono.
- Dirección (delivery) o `Entrega: Recoger en sucursal` (pickup).
- Método de pago (etiqueta legible).
- Folio: `CE-XXXXXX`.

Phone limpio: `preg_replace('/\D+/', '', $local->whatsapp)`.

Resultado: `https://wa.me/<phone>?text=<rawurlencode(msg)>`.

### Frontend (espejo)
`apps/web/src/lib/whatsapp.ts` → `buildWhatsAppUrl(local, items, payload)`.

Implementa el mismo formato en TypeScript. Usos:
- **Preview** en el carrito antes de confirmar el pedido.
- **Fallback** si el backend no devuelve `whatsapp_url` por alguna razón.

> **Regla**: si cambias el formato en un lado, cambia el otro. Ver tests del builder en PHP (`PedidoFlowTest`). Falta test del builder en TS.

## Ejemplo de mensaje

```
Hola Tacos El Gordo, quiero pedir:

• 2× Taco al Pastor — $56
    ↳ Tortilla: Harina
    ↳ Salsas: Habanero
• 1× Coca Cola de vidrio — $28

Subtotal: $84
Envío:    $35
Total:    $119

Nombre:    María Pérez
Teléfono:  5215512345678
Dirección: Av. Insurgentes 432
Pago:      Efectivo
Folio:     CE-AB12CD
```

URL resultante: `https://wa.me/5215512345678?text=Hola%20Tacos%20El%20Gordo%2C...`

## Persistencia

`pedidos.whatsapp_url` (TEXT). Se llena al crear el pedido (excepto sucursal). Migración `2024_02_02` amplió de varchar(500) a TEXT porque los mensajes encoded son largos.

Cuando un pedido se carga via API, la URL viene en `PedidoResource` para que el frontend pueda re-mostrarla sin recalcular.

## Roadmap

- **WhatsApp Business API real** (Meta + BSP como Twilio/360dialog) — fase futura. Permitiría:
  - Confirmación automática del lado del cliente.
  - Mensajes salientes desde el panel del local.
  - Estado real (delivered/read).
- **Templates aprobados** — requeridos por Meta para iniciar conversación.
- **Notificación al cliente** cuando el pedido cambia de estado (`preparando`, `listo`, `en_camino`).

Fase 6 en roadmap. Hoy: deep-links únicamente.

## Limitaciones del formato actual

- Sin soporte para varios métodos de entrega en un mismo mensaje.
- Sin precio individual del producto cuando hay descuento aplicado en el carrito.
- Sin badge de promoción.
- Texto plano (no Markdown WhatsApp ni emojis).
