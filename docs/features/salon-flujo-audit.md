# Audit del flujo de Salón / Mesas (2026-08-31)

Estado real del control de salón (Venta → Mesas → Cocina → Mesero → Caja) verificado
contra código. Complementa [`plan-499-operacion-salon-implementacion.md`](plan-499-operacion-salon-implementacion.md)
(el plan dice "✅ Completo" en todo; este audit matiza qué está realmente conectado de punta a punta).

## Resumen ejecutivo

El backend de salón existe y es sólido (mesas, cuentas de mesa, caja con cortes, split bill,
gift cards, tip pooling informativo). **El problema no es de datos, es de flujo y de UI**: las
piezas están, pero no están conectadas en el recorrido que el negocio necesita, y faltan 3
capacidades de control (quién atiende, historial de mesa, handoff venta→caja).

## Estado actual por pantalla

| Pantalla | Ruta | Qué hace hoy |
|---|---|---|
| **Venta / POS** | `/admin/punto-venta` (titulada "Caja" en UI, mal) | Arma venta de mostrador y **cobra directo** (`POST /pedidos`, `metodo_entrega:'sucursal'`). Un solo botón **"Cobrar"**. No conoce mesas. No manda a caja. |
| **Mesas** | `/admin/mesas` | CRUD de pisos+mesas, QR por mesa, mapa con drag (`pos_x/pos_y`). Semáforo `libre`/`ocupada`/`por_cobrar` con color. Click en mesa → solo **QR / Editar / Borrar**. Sin polling. |
| **Cocina** | `/admin/cocina` | Polling 15s. Muestra items + mesa. Máquina `nuevo→confirmado→preparando→listo`. Imprime comanda. |
| **Mesero** | `/admin/mesero` | Polling 15s. Solo **llamados pendientes** + **listos para entregar**. Reactivo. |
| **Caja** | `/admin/caja` | Cobra **cuentas de mesa** (`GET /cuentas-mesa`), split/pago mixto/propina/gift card, cortes de turno con varianza. Sin polling. |
| **QR de mesa** | `/mesa/{qrToken}` | Comensal ordena (menú + extras), llama mesero. Sin login, sin pago. Al pedir: `abrirParaMesa` + `adjuntarPedido`. |

## Modelo de datos real (lo que sí existe)

- `mesas`: `id, local_id, piso_id, etiqueta, pos_x, pos_y, estado(enum libre|ocupada|por_cobrar), qr_token`.
- `pedidos`: `mesa_id`, `cuenta_mesa_id`, `metodo_entrega(pickup|delivery|sucursal)`, `estado(nuevo…entregado|cancelado)`, `estado_pago(string, default pendiente)`.
- `cuentas_mesa`: agrupa N pedidos → `estado(abierta|pre_cuenta|cerrada)`, subtotal/total/propina.
- `pagos_cuenta_mesa`: split/mixto (`monto`, `metodo_pago`, `pagado_por` string libre, `corte_caja_id`).
- `cajas`, `cortes_caja` (abierto_por/cerrado_por), `movimientos_caja`.
- `llamados_mesero`: `mesa_id, atendido_por(user), atendido_at`.
- `PropinaReparto`: reparto informativo por rol al cerrar cuenta.

El estado de la mesa lo muta `CuentaMesaService` (abrir cuenta→`ocupada`, pre-cuenta→`por_cobrar`,
cerrar→`libre`) y manualmente `PATCH /mesas/{id}`.

## GAPS confirmados (código, no supuestos)

### Bloqueantes para el control que se pide
1. **Venta no separa pedido de cobro.** El POS cobra en el acto; no hay **"enviar a caja"** ni pedido abierto. No hay selector de mesa en Venta.
2. **Mesa no sabe quién la atiende.** `mesas` no tiene `atendido_por`/`mesero_id`. No hay endpoint "tomar control". El único "atendió" es por-llamado en `llamados_mesero`, no por-mesa.
3. **Sin historial de cambios de mesa.** No existe tabla de eventos/log; el `estado` se sobrescribe in-place sin quién/cuándo.
4. **Mesero no gestiona mesas.** No ve mesas libres ni toma control; solo atiende llamados y entrega listos.

### Deuda / inconsistencias de dinero
5. **`pedidos.estado_pago` está muerto en dine-in.** Cerrar la cuenta NO marca los pedidos pagados ni entregados → posible descuadre "cuenta cerrada" vs "pedidos pendientes".
6. **Mostrador en efectivo no entra al corte de caja.** Solo se reconcilia el efectivo de cuentas de mesa que pasan `corte_caja_id`; el mostrador cobrado en Venta no se liga a ningún corte.

### Pulido
7. **Semáforo solo en Mesas.** Cocina y Caja pintan chip ámbar fijo (no codifican estado por color).
8. **Refresco inconsistente.** Cocina/Mesero hacen polling 15s; Mesas/Caja no → el semáforo de mesas se ve viejo.
9. **Sin middleware de permisos central** (cada controller de zona valida a mano — deuda conocida).

## Qué SÍ cumple ya la visión pedida
- Cocina recibe **items + mesa** correctamente (`salon/cocina/pedidos` con `detalles`+`mesa`).
- El pedido **nace sin cobrar** (`OrderService`, `estado='nuevo'`) — la base para separar cobro ya está.
- El **semáforo de 3 estados** ya existe a nivel datos y se auto-actualiza desde la cuenta.
- Caja ya cobra con **split bill / pago mixto / propina / gift card / cortes**.

Ver el diseño propuesto y las decisiones pendientes en
[`salon-flujo-mejoras-propuestas.md`](salon-flujo-mejoras-propuestas.md).
