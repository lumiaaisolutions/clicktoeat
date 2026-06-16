# Feature — Cupones / códigos de descuento

> Owner crea códigos como `BIENVENIDO` o `VERANO20`. Cliente final los
> aplica en checkout antes de mandar el pedido por WhatsApp.

## Modelo

```sql
cupones (
  id, local_id (FK), codigo (string 32 unique por local),
  tipo ENUM('percent','fixed'),
  valor decimal(10,2),
  min_subtotal decimal(10,2),
  max_descuento decimal(10,2) NULL,
  fecha_desde, fecha_hasta,
  max_usos INT NULL,
  usos_actuales INT,
  activo BOOL,
  softDeletes, timestamps
)

pedidos (
  ... + cupon_codigo, descuento
)
```

`local_id + codigo` es UNIQUE — un local no puede tener dos cupones con
el mismo código pero dos locales sí pueden tener `BIENVENIDO`.

## Endpoints

### Admin (tenant-scoped, owner+staff con permiso)
- `GET    /api/v1/cupones`           — list paginado
- `POST   /api/v1/cupones`           — crear
- `GET    /api/v1/cupones/{id}`      — show
- `PATCH  /api/v1/cupones/{id}`      — editar
- `DELETE /api/v1/cupones/{id}`      — soft-delete
- `POST   /api/v1/cupones/{id}/toggle` — pausar/activar

### Público (sin auth, rate 30/min)
- `POST /api/v1/public/cupones/{slug}/validar` body `{codigo, subtotal}`
  → `{valid, descuento, message}`

## Aplicación en pedido

1. Frontend valida con `/validar` y muestra preview del descuento.
2. Frontend manda el pedido con `cupon_codigo` en el payload.
3. Backend (`Public\PedidoController::store`) llama a `aplicarCupon()`
   tras crear el pedido:
   - Lock pesimista del cupón (`lockForUpdate`)
   - Revalida fechas / cupos / activo
   - Calcula descuento server-side (NO confía en el frontend)
   - Actualiza `pedido.{cupon_codigo, descuento, total}`
   - Incrementa `cupon.usos_actuales`

Si el cupón ya no es válido al momento de crear el pedido, el pedido se
guarda igual sin descuento (no rompe el flujo del cliente).

## UI

- `/admin/cupones` — CRUD con accordion estilo del resto del admin.
  Crear/editar muestra modal con campos tipo/valor/min/max/fechas/activo.
- `LandingClient.CheckoutSheet` — input "Código de descuento (opcional)"
  con botón "Aplicar" → llamada a `/validar`. Si OK, pill verde con
  descuento + opción "Quitar". El resumen muestra línea "− \$X" del cupón.

## Patrones evitados

- **No confiar en el descuento del frontend** — siempre se recalcula
  server-side. El payload puede mandar `cupon_codigo`, pero el monto del
  descuento se calcula con `Cupon::calcularDescuento($subtotal)`.
- **No race-condition** en max_usos — `lockForUpdate` evita que dos
  pedidos simultáneos consuman el último cupo.
- **Soft-delete** para no perder histórico de cupones aplicados a
  pedidos pasados.

## Por implementar

- Tour interactivo de cupones (`tours.ts` slug `cupones`).
- Audit log automático para CRUD (ya cubierto por AuditLogger global).
- Tests: validación expirado/agotado/min_subtotal/concurrencia.

## Ver también

- [`pedidos-programados.md`](pedidos-programados.md) — feature sibling
- [`pedidos.md`](pedidos.md) — flujo de pedido público
