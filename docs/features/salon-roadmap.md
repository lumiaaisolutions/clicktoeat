# Salón / Mesas — Roadmap por fases (2026-08-31)

Backlog completo del control de salón, dividido en fases para no perder el hilo.
Consolida el flujo pedido por el owner + los 8 pendientes detectados en el audit.
Origen: [`salon-flujo-audit.md`](salon-flujo-audit.md) · [`salon-flujo-mejoras-propuestas.md`](salon-flujo-mejoras-propuestas.md).

Orden = de menor a mayor riesgo. Cada fase se verifica (tests + navegador) antes de la siguiente.
**Nada se despliega a producción sin confirmación explícita del owner.**

| Fase | Contenido | Riesgo | Estado |
|---|---|---|---|
| **A** | **Control de mesa**: `atendido_por` en mesa, tomar/liberar (exclusivo), "quién atiende" en Mesas, sección de mesas + "Tomar control" en Mesero | Bajo (aditivo) | ✅ Hecho (local, sin deploy) |
| **B** | **Historial de mesa**: tabla `mesa_eventos` + logging + timeline en el panel de detalle de la mesa | Bajo | ✅ Hecho (local, sin deploy) |
| **C** | **Pulido**: semáforo por color en Cocina y Caja, polling en Mesas y Caja, **aviso sonoro/visual en web** al llegar pedido (pendiente #7) | Bajo | ✅ Hecho (local, sin deploy) |
| **D** | **Todo por Caja + integridad de dinero** (#1): Venta arma pedido y "Envía a caja" (+ selector de mesa), Caja cobra mostrador + mesas, cerrar-cuenta marca pagado, reconciliación al corte | **Alto (dinero)** | ✅ Hecho (local, sin deploy) |
| **E** | **Cocina pro**: KDS por ítem (#2) + tiempos/SLA con alerta de atrasados (#3) | Medio | ✅ Hecho (local, sin deploy) |
| **F** | **Middleware de permisos central** (#4): `EnsurePermiso` (`permiso:zona`) en cocina/mesero/caja | Medio | ✅ Hecho (local, sin deploy) |
| **G** | **Gestión de mesa avanzada**: transferir/unir cuentas (#5) + estados ricos `reservada`/`limpieza` (#6) | Medio | ✅ Hecho (local, sin deploy) |
| **H** | **Realtime real** (#8): reactivar los eventos `ShouldBroadcast` ya escritos (hoy polling 15s por ADR-015) — solo si el owner cambia la postura de no-terceros | Alto (infra) | ⏳ (bloqueado por ADR-015) |

## Mapa pendiente → fase
1. Integridad de dinero → **D**
2. KDS por ítem → **E**
3. Tiempos/SLA cocina → **E**
4. Middleware de permisos → **F**
5. Transferir/unir mesas → **G**
6. Estados de mesa ricos → **G**
7. Aviso al staff en web → **C**
8. Realtime → **H**

## Fase A — detalle técnico (✅ hecho, verificado local, sin deploy)
- **Backend hecho**: migración `2026_08_31_120000_add_atendido_por_to_mesas_table` (`atendido_por` FK nullable a users + `atendido_desde`, FK solo en MySQL); `Mesa::mesero()` + fillable/cast; `MesaResource` (expone `atiende`, sin filtrar el User completo); endpoints `POST mesas/{id}/tomar`, `POST mesas/{id}/liberar`, `GET mesas/{id}` (show con cuenta activa+pedidos); `MesaPolicy::tomar/liberar` (exclusivo, owner puede reasignar). **8 tests nuevos** (`SalonControlMesaTest`) — 67 tests relacionados en verde, sin regresiones.
- **Frontend hecho**: `/admin/mesero` con nueva sección "Mesas del salón" (semáforo + "Tomar control"/"Liberar" + "Atiende: X") reusando `GET /mesas`; `/admin/mesas` muestra "Atiende: {nombre}" en cada card. `tsc --noEmit` limpio.
- **No desplegado**: espera confirmación del owner para `deploy-api.sh` + `deploy-web.sh`.

## Fase B — detalle técnico (✅ hecho, verificado local, sin deploy)
- **Backend hecho**: migración `2026_08_31_130000_create_mesa_eventos_table`; modelo `MesaEvento` (BelongsToTenant + helper `registrar()` que toma `Auth::id()`); logging en `MesaController` (tomar/liberar/cambio manual de estado) y en `CuentaMesaService` (abrir→ocupada, pre-cuenta→por_cobrar, cerrar→libre+cuenta_cerrada, pedido_agregado); `GET mesas/{id}` ahora devuelve `eventos` (últimos 40). Cerrar cuenta **también libera al mesero** (`atendido_por=null`, decisión D3). **4 tests nuevos** (`SalonMesaHistorialTest`) — 71 tests relacionados en verde.
- **Frontend hecho**: `/admin/mesas` → botón **"Ver"** en cada mesa abre un **panel de detalle** (modal) con estado, quién atiende, **Tomar/Liberar**, cuenta actual (total + pedidos) y **timeline del historial**. Cierra el panel pendiente de la Fase A. `tsc` limpio.
- **Pendiente menor**: polling en `/admin/mesas` (hoy sin auto-refresh) → agrupado en Fase C.

## Fase D — detalle técnico (✅ core hecho, verificado local, sin deploy)
- **Backend hecho**: migración `2026_08_31_140000_add_corte_caja_id_to_pedidos`; `Pedido::$fillable` gana `estado_pago/pagado_at/corte_caja_id`; `CuentaMesaService::cerrar` marca los pedidos de la cuenta como `pagado`+`pagado_at` (gap #5); `CajaService::cobrarPedido()` (cobro de mostrador, pago único, liga efectivo al corte) + `cerrarCorte` suma el efectivo de mostrador a la reconciliación (gap #6); endpoints `GET caja/pendientes` y `POST pedidos/{id}/cobrar` (con verificación explícita de tenant — es endpoint de dinero). **8 tests nuevos** (`SalonCajaMostradorTest`) — 72 tests relacionados en verde.
- **Frontend hecho**: `/admin/caja` gana sección **"Mostrador — por cobrar"** (lista `GET /caja/pendientes`, cobra con Efectivo/Tarjeta/Transferencia ligando al corte abierto) + polling. `/admin/punto-venta`: botón **"Cobrar" → "Enviar a caja"**.
- **Falta pulir en Venta (queda como F-D2, riesgo medio)**: quitar el paso de pago del POS (hoy el `CheckoutModal` aún pide método, pero es tentativo — el cobro real ocurre en Caja) y agregar el **selector de mesas disponibles** en Venta. Requiere verificación E2E en navegador antes de deploy.

> **Importante**: la Fase D toca dinero. Verificada con tests unitarios/feature, pero **pendiente de E2E en navegador + confirmación del owner antes de `deploy-api.sh`/`deploy-web.sh`.**

## Fases D-2, E, F, G — detalle técnico (✅ hecho, verificado local, sin deploy)

**D-2 (pulido Venta)**: `StoreInternalPedidoRequest` acepta `mesa_id`; `PedidoController::store` adjunta el pedido a la cuenta de la mesa (`abrirParaMesa`+`adjuntarPedido`) cuando Venta asigna mesa — así se cobra cerrando la cuenta, no como pedido suelto. Frontend: **selector de mesa** en el checkout del POS + botón "Enviar a caja". +1 test (venta con mesa adjunta a cuenta).

**E (Cocina pro)**: migración `add_estado_to_detalle_pedidos`; `DetallePedido.estado` (pendiente|listo) + resource; endpoint `PATCH detalle-pedidos/{id}/estado` (permiso:cocina, tenant-safe). Frontend cocina: **cada platillo se marca listo** (check + tachado) y card con **tiempo transcurrido + alerta roja de atraso** (SLA 15 min). **4 tests** (`SalonKdsItemTest`).

**F (permisos central)**: middleware `EnsurePermiso` (alias `permiso`); aplicado a cocina (`permiso:cocina`), mesero (`permiso:mesero`), caja (`permiso:caja`) y tomar/liberar mesa. **5 tests** (`SalonPermisosTest`).

**G (mesa avanzada)**: migración `extend_mesa_estado_enum` (+`reservada`,+`limpieza`, guard MySQL); `CuentaMesaService::transferir()` (cuenta a otra mesa libre) y `unir()` (mueve pedidos, cierra origen, libera su mesa); endpoints `POST cuentas-mesa/{id}/transferir` y `/unir`. Frontend: colores de los 2 estados nuevos, y en el panel de detalle de mesa: **cambiar estado** (Libre/Reservada/Limpieza) + **transferir** a mesa libre. **5 tests** (`SalonTransferirUnirTest`).

## Fase H — Realtime (⛔ bloqueada por decisión del owner)
No se implementa: [ADR-015](../decisions/ADR-015-realtime-polling-definitivo.md) fija **polling 15s como arquitectura definitiva de v1** (el owner rechazó terceros de paga y Reverb autoalojado). Los eventos `ShouldBroadcast` ya escritos quedan inactivos, listos para activar sólo por config si el owner cambia la postura. **No es un pendiente de código, es una decisión de negocio.**

## Verificación global (2026-08-31)
- **Backend**: 366 tests pasan · 40+ nuevos de salón en verde (control, historial, caja/mostrador, permisos, KDS, transferir/unir). 1 fallo preexistente ajeno (`MetricasUtilidadTest`, sensible a fin de mes, no toca salón).
- **Frontend**: `tsc --noEmit` limpio.
- **Sin desplegar**: 6 migraciones + endpoints + 6 páginas acumulados. La Fase D toca dinero → **E2E en navegador + confirmación del owner antes de `deploy-api.sh`/`deploy-web.sh`.**
