# Salón / Mesas — mejoras propuestas y plan (2026-08-31)

Diseño para cumplir el control pedido por el owner, sobre el audit en
[`salon-flujo-audit.md`](salon-flujo-audit.md). **Cambios mínimos**: se reusa el modelo
existente (mesas, cuentas_mesa, caja) y se agrega solo lo faltante.

> ⚠️ Este doc tiene **decisiones pendientes** (§ Decisiones abiertas). No se implementa hasta cerrarlas.

## Visión objetivo (lo que pidió el owner)

1. **Venta** arma el pedido y lo asigna a una mesa (botones de mesas disponibles si hay mesas),
   **pero NO cobra** → botón **"Enviar a caja"** → **Caja** cobra.
2. **Mesas** con semáforo de status; click en mesa despliega: **mover**, **ver info/cuenta**,
   **historial de cambios** y **quién atiende**.
3. **Cocina** recibe items + mesa + semáforo de estado por color.
4. **Mesero** ve mesas libres y **toma control** de una mesa; al tomarla, **Mesas muestra quién atiende**.

## Cambios propuestos (por capa)

### Backend
- **Migración `add_atendido_por_to_mesas`**: `mesas.atendido_por` (FK nullable a users) + `atendido_desde` (timestamp). Alternativa: ponerlo en `cuentas_mesa` (se libera al cerrar). → decisión D3.
- **Nueva tabla `mesa_eventos`** (historial): `id, local_id, mesa_id, tipo(estado_cambio|tomada|liberada|pedido_agregado|cuenta_cerrada|movida), estado_anterior, estado_nuevo, user_id, meta(json), created_at`. Se escribe desde `CuentaMesaService`, `MesaController`, y el nuevo endpoint de "tomar control".
- **Endpoints nuevos** (`MesaController`/`SalonController`, gated `dine_in`):
  - `POST mesas/{mesa}/tomar` → set `atendido_por=user`, log evento, evento realtime.
  - `POST mesas/{mesa}/liberar` → limpia `atendido_por`.
  - `GET mesas/{mesa}` (falta el `show`) → mesa + cuenta abierta + pedidos + eventos + quién atiende.
  - `POST cuentas-mesa/{cuenta}/transferir` `{mesa_destino_id}` → mover cuenta a otra mesa (si D2 = transferir).
  - `POST pedidos/{pedido}/enviar-a-caja` **o** reusar `pre-cuenta` (→ decisión D1).
- **Cerrar cuenta cierra pedidos**: `CuentaMesaService::cerrar` debe marcar `pedidos.estado_pago='pagado'` + `pagado_at` (y opcionalmente `estado='entregado'`). Corrige gap #5.
- **Reconciliar mostrador**: si Venta cobra mostrador, ligar el efectivo a un corte abierto (o mover mostrador también a Caja — decisión D1). Corrige gap #6.

### Frontend
- **Venta (`/admin/punto-venta`)**: si `dine_in` activo y hay mesas → selector/botones de **mesas disponibles**; el botón pasa de "Cobrar" a **"Enviar a caja"** (dine-in) manteniendo "Cobrar" solo si D1 permite mostrador directo. Renombrar título "Caja"→"Venta".
- **Mesas (`/admin/mesas`)**: click en mesa → **panel de detalle** (cuenta actual, total, pedidos, quién atiende, historial de eventos) con acciones **Tomar/Liberar**, **Ver cuenta**, **Transferir** (D2), **Mover** (posición ya existe). Agregar **polling** (o realtime) para semáforo vivo.
- **Cocina**: colorear el chip por estado (nuevo=gris, confirmado=azul, preparando=ámbar, listo=verde).
- **Mesero**: nueva sección **"Mesas"** (libres/ocupadas con semáforo) + botón **"Tomar control"**; al tomar, aparece en Mesas "Atiende: {nombre}".

### Realtime
- Se mantiene **polling** (ADR-015). Agregar polling a Mesas/Caja (hoy no lo tienen). Los eventos `ShouldBroadcast` ya escritos quedan listos si algún día se activa realtime.

## Plan por fases (sugerido)
- **F1 — Handoff Venta→Caja** (decisión D1): selector de mesa en Venta + "Enviar a caja" + Caja cobra dine-in y (si aplica) mostrador. Cierra pedidos al cobrar.
- **F2 — Control de mesa**: `atendido_por` + endpoints tomar/liberar + panel de detalle en Mesas + "quién atiende".
- **F3 — Historial**: tabla `mesa_eventos` + logging + timeline en el panel de detalle.
- **F4 — Pulido**: semáforo por color en Cocina/Caja, polling en Mesas/Caja, transferir/unir mesas, reconciliación de mostrador.

Cada endpoint nuevo lleva su **test de aislamiento multi-tenant** (regla CLAUDE.md #7).

## Decisiones tomadas (owner, 2026-08-31)
- **D1 = TODO pasa por Caja.** Venta (mostrador, para-llevar y mesas) **solo arma el pedido**; el cobro SIEMPRE ocurre en Caja. → El POS deja de cobrar; su botón pasa a **"Enviar a caja"**. Caja debe poder cobrar **pedidos de mostrador** (no solo cuentas de mesa). `pedidos.estado_pago` pasa a ser la fuente de verdad de "cobrado".
- **D2 = Mover = solo posición en el mapa** (ya existe con drag). **Transferir/unir mesas quedan FUERA de alcance v1** (opcional futuro).
- **D3 (resuelto internamente) = `mesas.atendido_por`** (FK a users) + `atendido_desde`. Persiste mientras la mesa esté tomada; se limpia al **liberar** o al **cerrar la cuenta**. Coherente con D4 (exclusivo).
- **D4 = Exclusivo del mesero.** Al tomar, la mesa queda asignada a ese mesero; otro no puede tomarla hasta que la libere. El **owner puede reasignar/forzar liberación**.
- **D5 = Mixto** (a veces owner, a veces staff por rol). ⇒ "quién atiende" es operativo, no solo informativo; los permisos `cocina/mesero/caja` importan.

### Impacto de D1 (todo por caja) — el cambio más grande
- **Venta**: quita cobro directo; crea el pedido (`estado='nuevo'`, `estado_pago='pendiente'`) y lo manda a Caja. Para mesa, lo adjunta a la cuenta (`abrirParaMesa`+`adjuntarPedido`, ya existe). Para mostrador/para-llevar, queda como **pedido pendiente de cobro** visible en Caja.
- **Caja**: además de cuentas de mesa, lista **pedidos de mostrador pendientes** y los cobra (nuevo endpoint `POST pedidos/{pedido}/cobrar` que reusa la lógica de pagos/corte, marca `estado_pago='pagado'`, liga efectivo al corte abierto → corrige gap #6).
- **Cerrar cuenta** marca sus pedidos `estado_pago='pagado'` (corrige gap #5).
- **Riesgo**: es un cambio de flujo de dinero → va con tests de cobro + aislamiento y **NO se despliega sin verificación E2E + confirmación del owner**.

## Alcance ajustado y orden de construcción
1. **F2 — Control de mesa (bajo riesgo, additivo):** `mesas.atendido_por`+`atendido_desde`, endpoints `tomar`/`liberar` (exclusivo, owner puede forzar), `GET mesas/{id}` con detalle, panel de detalle en `/admin/mesas`, sección "Mesas" + "Tomar control" en `/admin/mesero`, "Atiende: X" en Mesas.
2. **F3 — Historial:** tabla `mesa_eventos` + logging desde los puntos de cambio + timeline en el panel.
3. **F4 — Pulido:** semáforo por color en Cocina/Caja, polling en Mesas/Caja.
4. **F1 — Todo por Caja (dinero, mayor riesgo):** al final y con su propio ciclo de verificación E2E. Reetiquetar "Venta"→pedido, "Enviar a caja", Caja cobra mostrador, cerrar-cuenta-marca-pagado, reconciliación de mostrador al corte.

> Se construye F2→F3→F4→F1 (de menor a mayor riesgo). Cada fase se verifica antes de la siguiente. Ninguna toca producción sin confirmación explícita del owner.
