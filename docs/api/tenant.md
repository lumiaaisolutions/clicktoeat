# API — Endpoints tenant-scoped

Middleware: `auth:sanctum` + `tenant`. Todos están scopeados al `local_id` del usuario autenticado (excepto super_admin que ve todo).

## Smoke test

### GET `/dashboard`
Devuelve `{ mensaje, rol, local_id }`. Útil para verificar que el tenant scope está activo.

---

## Local (mío)

### GET `/local`
Devuelve el local del usuario autenticado (`LocalResource`).

### PATCH `/local`
Actualiza branding, contacto, operación. Validación: `UpdateBrandingRequest`.

Campos permitidos: `nombre`, `tagline`, `logo_url`, `banner_url`, `color_*`, `tipografia`, `dark_mode`, `whatsapp`, `telefono`, `email_contacto`, `direccion`, `lat`, `lng`, `horarios`, `delivery_fee`, `delivery_min_minutos`, `delivery_radio_km`, `zona_entrega`, `metodos_pago`, `redes_sociales.*`.

---

## Horarios

### GET `/local/horarios`
```json
{
  "data": {
    "horarios": [{"dia":"lun","open":"12:00","close":"23:00"}, ...],
    "cerrado_temporal": false,
    "zona_horaria": "America/Mexico_City",
    "estado": { "abierto": true, "mensaje":"...", ... }
  }
}
```

### PATCH `/local/horarios`
Actualiza los 3 campos. Normaliza ordenando por día de semana y deduplicando. Validación: `UpdateHorariosRequest`.

Ver lógica de cálculo en [`features/horarios.md`](../features/horarios.md).

---

## Métricas

### GET `/metricas?preset=30d`
KPIs, serie diaria, top productos, margen aproximado.

Parámetros:
- `?preset=hoy|ayer|7d|30d|mes` (default `30d`)
- `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`

Respuesta (resumen — ver `MetricasService::calcular`):
```json
{
  "data": {
    "rango": {"desde":"2026-05-12","hasta":"2026-06-10","dias":30},
    "resumen": {
      "pedidos": 142, "ventas_total": 18450.5,
      "ventas_subtotal": 17200, "ingresos_envio": 1250.5,
      "ticket_promedio": 130.01,
      "costo_compras": 6800, "margen_aprox": 11650.5, "margen_pct": 63.1,
      "bajo_stock": 3
    },
    "por_estado":  { "nuevo": 10, "entregado": 120, "cancelado": 12 },
    "por_entrega": { "pickup": {"pedidos":80,"monto":...}, "delivery": {...}, "sucursal": {...} },
    "por_pago":    { "efectivo": {...}, ... },
    "serie_diaria": [{"fecha":"2026-05-12","pedidos":4,"ventas":520}, ...],
    "top_productos": [{"producto_nombre":"Taco al Pastor","cantidad":120,"ingresos":3360,"pedidos":80}, ...]
  }
}
```

Cancelados se excluyen de KPI principales. Ver [`features/metricas.md`](../features/metricas.md).

---

## Categorías — `apiResource`

| Método | Ruta                  | Acción                                                  |
|-------|-----------------------|---------------------------------------------------------|
| GET   | `/categorias`          | lista con `productos_count`, filtro `?activo=`           |
| POST  | `/categorias`          | crear (auto-slug)                                        |
| GET   | `/categorias/{id}`     | mostrar                                                  |
| PATCH | `/categorias/{id}`     | actualizar                                                |
| DELETE| `/categorias/{id}`     | borrar — **409 si tiene productos**                       |

---

## Productos — `apiResource`

| Método | Ruta                | Acción                                                     |
|-------|---------------------|------------------------------------------------------------|
| GET   | `/productos`         | lista paginada, filtros `?q=&categoria_id=&disponible=&per_page=` |
| POST  | `/productos`         | crear                                                       |
| GET   | `/productos/{id}`    | mostrar                                                     |
| PATCH | `/productos/{id}`    | actualizar — si cambia `imagen_public_id`, borra la anterior |
| DELETE| `/productos/{id}`    | borrar (limpia imagen)                                       |

Validación: `Store/UpdateProductoRequest`. Incluye estructura del JSON `extras`.

---

## Recetas

| Método | Ruta                                  | Acción                                                |
|-------|---------------------------------------|-------------------------------------------------------|
| GET   | `/productos/{producto}/recetas`        | lista de la receta                                    |
| PUT   | `/productos/{producto}/recetas`        | **sync** (reemplaza completo, idempotente)             |
| DELETE| `/recetas/{receta}`                    | borra una entrada                                      |

PUT body:
```json
{
  "recetas": [
    { "ingrediente_id": 5, "cantidad": 2 },
    { "componente_producto_id": 12, "cantidad": 1 }
  ]
}
```
Cada línea usa **ingrediente XOR componente** (validado). Componente no puede ser el mismo producto. Ver [`features/recetas.md`](../features/recetas.md).

---

## Ingredientes — `apiResource` + ajustes

| Método | Ruta                                     | Acción                                                 |
|-------|------------------------------------------|--------------------------------------------------------|
| GET   | `/ingredientes`                           | lista, filtro `?bajo_stock=true`                        |
| POST  | `/ingredientes`                           | crea + movimiento inicial `tipo=entrada` si `stock>0`    |
| GET   | `/ingredientes/{id}`                      | mostrar                                                 |
| PATCH | `/ingredientes/{id}`                      | actualizar                                              |
| DELETE| `/ingredientes/{id}`                      | borrar — **409 si tiene recetas**                        |
| POST  | `/ingredientes/{id}/ajuste`               | entrada/ajuste/merma (positivo o negativo, 0 rechazado) |
| GET   | `/ingredientes/{id}/movimientos`          | historial paginado, filtros `?tipo=&desde=&hasta=`       |

POST `/ajuste` body:
```json
{ "tipo": "entrada | ajuste | merma", "cantidad": 10.5, "motivo": "ajuste físico" }
```

Stock nunca baja de 0 (se clampea con `max(0, ...)`).

---

## Compras

| Método | Ruta              | Acción                                                                                            |
|-------|-------------------|---------------------------------------------------------------------------------------------------|
| GET   | `/compras`         | lista paginada, filtros `?estado=&desde=&hasta=&per_page=`                                          |
| POST  | `/compras`         | registra compra: sube stock + actualiza `costo_unitario` con promedio ponderado + movimientos     |
| GET   | `/compras/{id}`    | mostrar con detalles                                                                                |
| DELETE| `/compras/{id}`    | anula: marca `anulada` + revierte stock — **409 si ya se consumió parte**                            |

POST body:
```json
{
  "proveedor": "Distribuidora Hermanos",
  "referencia_factura": "F-0012",
  "fecha": "2026-06-10",
  "impuestos": 0,
  "notas": "...",
  "items": [
    { "ingrediente_id": 5, "cantidad": 20, "costo_unitario": 12.5 }
  ]
}
```

Ver [`features/compras.md`](../features/compras.md).

---

## Notificaciones

| Método | Ruta                                            | Acción                                            |
|-------|--------------------------------------------------|---------------------------------------------------|
| GET   | `/notificaciones?solo_no_leidas=`                | últimas 100 + `no_leidas` count + pedidos activos  |
| POST  | `/notificaciones/leer-todas`                      | marca todas como leídas                            |
| POST  | `/notificaciones/{id}/leer`                       | marca una como leída                               |

GET respuesta:
```json
{
  "data": [ /* NotificacionResource[] */ ],
  "no_leidas": 3,
  "pedidos_activos": [ /* PedidoResource[] en estados nuevo/confirmado/preparando/listo */ ]
}
```

Frontend hace polling cada 30s. Ver [`features/notificaciones.md`](../features/notificaciones.md).

---

## Pedidos (admin del local)

| Método | Ruta                                | Acción                                                          |
|-------|-------------------------------------|-----------------------------------------------------------------|
| GET   | `/pedidos?estado=&per_page=`         | lista paginada                                                  |
| POST  | `/pedidos`                           | **POS / venta presencial** (`metodo_entrega` puede ser `sucursal`) |
| GET   | `/pedidos/{id}`                      | mostrar con detalles                                            |
| PATCH | `/pedidos/{id}/estado`               | cambia estado (timestamps automáticos en `confirmado`/`entregado`; re-stock si cancela) |
| DELETE| `/pedidos/{id}`                      | soft-delete                                                     |

PATCH `/estado` body:
```json
{ "estado": "nuevo | confirmado | preparando | listo | en_camino | entregado | cancelado" }
```

Comportamiento extra de POS interno: si `metodo_entrega=sucursal`, el pedido se auto-marca `confirmado` con `confirmado_at=now()` (el cliente ya pagó en caja).

Ver [`features/pos.md`](../features/pos.md) y [`features/pedidos.md`](../features/pedidos.md).

---

## Uploads

### POST `/uploads/image`
`multipart/form-data`. **Throttle `30/min`**.

Campos:
- `image` (file, requerido): JPG/PNG/WebP/AVIF, ≤ 5 MB
- `folder` (opcional): `productos | locales | banners | logos` (default `productos`)

**201**
```json
{
  "data": {
    "url": "http://localhost:8080/storage/uploads/productos/foo-abcd1234.png",
    "public_id": "uploads/productos/foo-abcd1234.png",
    "width": 800, "height": 600, "bytes": 124000
  }
}
```

Hoy escribe en disco `public` local (no Cloudinary). Ver [`features/uploads.md`](../features/uploads.md).
