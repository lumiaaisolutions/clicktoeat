# Centro de actividad — super_admin

Campanita en el sidebar del super_admin (paralela a la del owner) que
agrega eventos relevantes que típicamente requieren atención:

- **Tickets de soporte** con estado `abierto` (los últimos 20)
- **Locales nuevos** registrados en los últimos 7 días
- **Pagos fallidos**: locales con `plan_status` = `past_due` o `payment_failed`

## Diferencia con la campanita del owner

| | Owner | Super_admin |
|---|---|---|
| Componente | `NotificacionesBell` | `SuperAdminBell` |
| Datasource | `/v1/notificaciones` + pedidos en tiempo real | `/v1/admin/notificaciones` agregado |
| Acción al click | Marca como leído + redirige a `/admin/pedidos` | Redirige a la URL del evento (`/admin/tickets`, `/admin/locales/X`, etc.) |
| Persistencia | DB (table `notificaciones`) | Localstorage por id de notif (dismiss) |
| Polling | 30s | 60s |

## Endpoint

```
GET /api/v1/admin/notificaciones        super_admin
```

Response shape:
```json
{
  "data": [
    {
      "id": "ticket-42",
      "tipo": "ticket" | "nuevo_local" | "pago_fallido",
      "titulo": "Ticket abierto: ...",
      "mensaje": "Owner X · Tacos El Gordo",
      "url": "/admin/tickets",
      "created_at": "2026-06-16T18:00:00Z",
      "severity": "info" | "success" | "warning" | "danger"
    }
  ],
  "total": 12
}
```

## Por qué no persistimos en BD

El feed se calcula on-demand cada 60s. Si crece > 100 eventos activos
a la vez, materializar en tabla `super_notifications` con cron de cleanup.
Hoy con < 20 tickets + < 20 locales nuevos por semana, el query agregado
es trivial (~10ms en SQLite/MySQL).

## Dismiss persistente

El user puede ocultar notificaciones individualmente o "Ocultar todas".
Los IDs ocultos quedan en `localStorage` bajo `ce-super-notif-dismissed`.
Si un nuevo evento aparece con el mismo ID (raro — los IDs incluyen el tipo
+ id de DB), también se oculta. Para "resetear" el dismiss, limpia el
localStorage del navegador.
