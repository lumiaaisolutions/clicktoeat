# ADR-004: Snapshot de producto en `detalle_pedidos`

> **Status:** aceptada
> **Fecha:** 2026-06-10 (decisión histórica)
> **Decisores:** equipo inicial

## Contexto

Cuando un cliente pide un producto, el owner puede después:
- Subir el precio del producto.
- Renombrarlo.
- Borrarlo (soft o hard).
- Cambiar sus extras.

Si el `detalle_pedidos` simplemente apunta a `producto_id`, entonces:
- Listar un pedido viejo muestra el **precio actual**, no el cobrado.
- Si el producto se borra, el pedido pierde contexto.

## Decisión

`detalle_pedidos` guarda **snapshot inmutable** de:

- `producto_nombre` (varchar)
- `precio_unitario` (decimal — ya incluye extras)
- `extras_seleccionados` (JSON con `{group, item, price}`)
- `cantidad`, `subtotal`

La columna `producto_id` se conserva como FK, pero es `nullOnDelete` — si el producto se borra, el detalle sobrevive.

## Alternativas consideradas

- **Event sourcing completo** (cada cambio de producto deja un event, los pedidos referencian el event puntual) → descartada. Overhead enorme para un caso que se resuelve con 3 columnas más.
- **`producto_versions` tabla** (versionar cada cambio del producto y apuntar a la versión) → descartada por mismo motivo: overhead vs simplicidad.
- **Materializar precio al servir el detalle** vía join contra "histórico" → descartada; no hay tal histórico.

## Consecuencias

### Positivas

- **Histórico inmutable** sin event sourcing.
- Listar pedidos viejos siempre muestra el dato cobrado.
- Borrar productos no rompe la auditoría.
- `MetricasService` agrupa por `producto_nombre` (snapshot), por lo que renombrar un producto **no funde** dos entradas distintas en el top.

### Negativas

- Si el owner corrige un typo del nombre del producto, los pedidos viejos siguen mostrando el typo.
- Datos duplicados ("denormalización") — pequeño costo de storage.
- Si se renombra producto, las métricas dividirán "antes" y "después" en dos buckets distintos.

### Neutras

- `extras_seleccionados` también se snapshotea como JSON, por lo mismo. Si el owner cambia los extras del producto, las órdenes viejas conservan la opción que el cliente eligió.

## Patrones derivados

- En `MetricasService`, el top productos agrupa por `producto_nombre` precisamente porque es el snapshot.
- El `WhatsAppLinkBuilder` usa `producto_nombre` del detalle, no del producto vivo.

## Cuándo reabrir

- Si se introduce un sistema de "corrección retroactiva" del histórico (uso contable raro).
- Si los typos del nombre del producto se vuelven un problema operativo recurrente.

Ver [`docs/features/pedidos.md`](../features/pedidos.md#snapshot-de-precios), [`docs/models/detalle-pedido.md`](../models/detalle-pedido.md).
