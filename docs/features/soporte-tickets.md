# Sistema de tickets de soporte

Cola de tickets que los owners pueden abrir desde
`/admin/ayuda/contactar` y que el `super_admin` responde desde
`/admin/tickets`. Reemplaza el WhatsApp manual con un canal trazable e
histórico, sin perder el botón directo a WhatsApp para urgencias.

## Modelos

Tabla `support_tickets`:

| Columna     | Tipo                                          |
|-------------|-----------------------------------------------|
| `id`        | bigInt PK                                     |
| `local_id`  | FK nullable (super puede abrir tickets internos sin local) |
| `user_id`   | FK al owner que abrió                         |
| `asunto`    | string(200)                                   |
| `categoria` | enum (soporte, bug, facturacion, feature)     |
| `prioridad` | enum (baja, media, alta, urgente)             |
| `estado`    | enum (abierto, respondido, cerrado)           |
| timestamps  |                                               |

Tabla `support_messages`:

| Columna     | Tipo      | Notas |
|-------------|-----------|-------|
| `id`        | bigInt PK |       |
| `ticket_id` | FK        |       |
| `user_id`   | FK        | quién escribió |
| `mensaje`   | text      |       |
| `from_super`| boolean   | true si la respondió el super_admin |
| timestamps  |           |       |

Cada vez que el super_admin responde, el estado del ticket pasa a
`respondido` y se envía un correo al owner. Cuando el owner reabre con
una nueva respuesta, vuelve a `abierto`.

## Endpoints

```
GET    /api/v1/soporte/tickets              owner          sus tickets
POST   /api/v1/soporte/tickets              owner          abrir ticket
POST   /api/v1/soporte/tickets/{id}/reply   owner          agregar respuesta

GET    /api/v1/admin/tickets                super_admin    cola completa
POST   /api/v1/admin/tickets/{id}/responder super_admin    responder
POST   /api/v1/admin/tickets/{id}/cerrar    super_admin    cerrar
```

## Frontend

- Owner: `apps/web/src/app/admin/ayuda/contactar/page.tsx` con formulario +
  histórico.
- Super: `apps/web/src/app/admin/tickets/page.tsx` con filtros por estado
  y modal `TicketDetail`.
- El botón "Abrir ticket" se agregó junto al CTA de WhatsApp en
  `/admin/ayuda` para mantener el WhatsApp para urgencias.

## Notificaciones

- Email al owner cuando hay respuesta nueva (Mailable `TicketReply`).
- Push y email al super_admin cuando el owner abre o reabre un ticket.
