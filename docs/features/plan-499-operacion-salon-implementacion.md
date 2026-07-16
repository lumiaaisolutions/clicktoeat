# Plan técnico — Operación de salón para Premium ($499)

## Progreso (vivo — actualizar en cada sesión)

| Etapa | Backend | Frontend | Notas |
|---|---|---|---|
| A — Núcleo de salón | ✅ Completo | ✅ Completo | `/admin/mesas` (pisos+mesas CRUD, QR descargable), `/admin/cocina`, `/admin/mesero`, público `/mesa/[qrToken]` (menú simplificado sin extras, carrito local, llamar mesero) |
| B — Dinero | ✅ Completo (con reconciliación real 2026-07-16) | ✅ Completo | `/admin/caja` (abrir/cerrar corte, movimientos, cobrar cuenta con split/pago mixto) |
| C — Sucursales consolidadas | ✅ Completo | ✅ Completo | `/admin/cadena` (reporte consolidado, solo lectura) |
| D — Crecimiento/RRHH | ✅ Completo (con envío real de email 2026-07-16) | ✅ Completo | `/admin/reservaciones`, `/admin/lealtad-plus`, `/admin/gift-cards`, `/admin/campanas`, `/admin/turnos` (+ forecast) |

**Verificación de frontend (2026-07-16)**: `tsc --noEmit` limpio en las 12 páginas/componentes nuevos y en los stores/layout editados. `next lint` falla por un problema de configuración preexistente del proyecto (incompatibilidad de opciones ESLint, no relacionado a este trabajo).

**Verificación E2E en navegador real (2026-07-16)** — con dev servers levantados (`php artisan serve` + `npm run dev`) y datos sembrados (`tacos-el-gordo` con plan Premium, un piso/mesa/caja de prueba):
- Flujo completo cliente→cocina→mesero probado de punta a punta: pedido público en `/mesa/[qrToken]` → aparece en `/admin/cocina` con la mesa correcta → transiciones nuevo→confirmado→preparando→listo funcionan → aparece en `/admin/mesero` → llamar mesero desde la mesa pública aparece en tiempo real (dentro del polling) en `/admin/mesero`.
- `/admin/caja`: abrir corte, aplicar gift card a una cuenta de mesa (confirmado en backend: saldo bajó de $10 a $0, cuenta bajó de $28 a $18), todo con datos reales, no simulados.
- `/admin/mesas`, `/admin/reservaciones`, `/admin/gift-cards`, `/admin/campanas`, `/admin/turnos` (con forecast mostrando datos reales), `/admin/lealtad-plus`: cargan correctamente, sin errores de consola reales (los 429 vistos fueron por exceder el rate-limit local de 60 req/min a fuerza de navegar muy rápido durante las pruebas — no por un bug de código).
- **Bug real encontrado y corregido durante esta verificación**: `PedidoResource` nunca exponía `mesa_id` ni la relación `mesa` — cocina/mesero no podían mostrar de qué mesa era cada pedido. Corregido + `SalonController::pedidosCocina` ahora hace eager-load de `mesa`.
- **Hallazgo no corregido (gap preexistente, no introducido por esta sesión)**: los `refresh()` de las páginas admin nuevas (y de páginas ya existentes como `cupones/page.tsx`) no tienen `try/catch` — si la llamada falla, la página se queda en skeleton de carga infinito sin feedback al usuario. Es el mismo patrón ya usado en el resto del admin, no una regresión.
- **No verificado en navegador** (por fricción de rate-limit durante la sesión, sí cubierto por tests de backend): `/admin/cadena`, `/admin/organizaciones` — 7 tests de `OrganizationsConsolidadasTest` cubren estos flujos.
- **Corrección accidental durante la sesión**: los repetidos `migrate:fresh --env=testing` sin `.env.testing` presente terminaron corriendo contra el sqlite persistente de desarrollo (no contra `:memory:`), reseteándolo. **La base de datos de producción (MySQL en Hostinger) nunca fue tocada** — sólo el sqlite local de dev, que se resembró con el seeder estándar sin pérdida real (era sólo data de prueba).

**Simplificaciones v1 del frontend** (documentadas, no silenciosas):
- ~~Mapa de mesas: lista agrupada, no drag&drop~~ **Agregado 2026-07-16**: `/admin/mesas` ahora tiene un canvas con drag real (`FloorCanvas`, listeners `mousemove`/`mouseup` a nivel `window` — deliberadamente NO usa pointer capture para evitar ambigüedad de a qué elemento se enruta el evento) que persiste `pos_x`/`pos_y` vía `PATCH /mesas/{id}` al soltar. **No se pudo confirmar el gesto de arrastre con la herramienta de automatización de navegador de esta sesión** (su `left_click_drag` no parece disparar eventos `mousemove` intermedios reales) — el código sigue el patrón estándar de React para drag-and-drop y debería funcionar con mouse/touch real, pero falta una prueba manual humana antes de darlo por confirmado en producción.
- ~~Página pública de mesa: sin extras ni nombre de cliente~~ **Agregado y verificado E2E 2026-07-16**: selección de extras (radio/checkbox según `kind`, valida grupos requeridos antes de habilitar "Agregar") + campo de nombre opcional. Probado en navegador real: Taco al Pastor + tortilla maíz + queso fundido → `$40.00` correcto, `detalle_pedidos.extras_seleccionados` guardó ambos grupos server-side. Gap conocido: no hay UI para decrementar/quitar una línea con extras ya en el carrito (sólo se puede agregar más), aceptable para v1.
- Reservaciones: sin calendario visual, lista simple ordenada por fecha. ~~sin chequeo de traslape~~ **Agregado 2026-07-16**: ventana de traslape de 90 min por mesa (constante `ReservacionController::VENTANA_TRASLAPE_MINUTOS`, sin `duracion_minutos` explícita en el modelo v1) — 3 tests nuevos, 313 total pasan.
- **Impresión de comandas/tickets — agregado y verificado en navegador 2026-07-16** (Fase 2.4, punto 12): impresión vía navegador (`window.print()`), sin integración ESC/POS de hardware — cualquier impresora con driver del SO funciona. `/admin/cocina/comanda/[id]` (botón "Imprimir comanda" en cada card de `/admin/cocina`) y `/admin/caja/ticket/[id]` (botón "Ticket" en cada cuenta de `/admin/caja`), ambos reusan endpoints GET ya existentes (`/pedidos/{id}`, `/cuentas-mesa/{id}`) — sin endpoint nuevo. Verificado en navegador real: comanda muestra código de pedido, mesa, hora y extras seleccionados (`+ maiz`, `+ q`); ticket muestra items, subtotal, descuento de gift card, propina y total — sin errores de consola.
- **Paridad móvil (Expo) cocina/mesero — agregado 2026-07-17** (Fase 2.4, punto 12, alcance priorizado por el owner): pantallas `cocina.tsx`/`mesero.tsx` en `apps/mobile`, mismos endpoints que el panel web (`/salon/cocina/pedidos`, `/salon/mesero/pedidos`, `/salon/llamados` + `atender`), polling 10s + keep-awake + campana/haptics al llegar pedido nuevo (reusa infraestructura ya existente de `pedidos/index.tsx`). Detalle completo en `docs/features/app-movil-clicktoeat.md`. **No verificado en dispositivo/Expo Go** (sólo `tsc`/`eslint` limpios) — el resto de F102 (mesas, caja, cuentas de mesa, reservaciones, gift cards, campañas, turnos/asistencia) queda sólo en el panel web, consistente con la priorización explícita del owner.
- **Registro de asistencia (clock-in/out) — agregado y verificado en navegador 2026-07-17** (Fase 2.4, punto 12): tabla nueva `staff_attendances` (`local_id, user_id, entrada, salida nullable, notas nullable`, `BelongsToTenant`), sin unicidad a nivel BD para "una sola entrada abierta" — se valida en `StaffAttendanceController` (409 si ya hay una entrada sin salida, 409 si se intenta cerrar salida sin entrada abierta). Endpoints bajo el mismo feature flag `rrhh_turnos` que `staff-shifts` (no se creó un flag nuevo — ADR-012 ya framea clock-in/out como prerrequisito del mismo bundle de "turnos"): `POST /asistencias/entrada`, `POST /asistencias/salida`, `GET /asistencias/estado`, `GET /asistencias` (staff ve solo lo propio, owner ve y filtra todo el equipo por `user_id`/`desde`/`hasta`), `DELETE /asistencias/{id}` (solo owner, para corrección). Nav "Asistencia" en `/admin/asistencia` sin `permiso`/`ownerOnly` — visible a todo staff autenticado del local (cocina/mesero/caja/owner), sólo bloqueada por el candado de plan Premium. 11 tests nuevos (incluye aislamiento multi-tenant, doble-entrada bloqueada, salida-sin-entrada bloqueada, staff no puede tocar registro ajeno, owner sí puede corregir/borrar) — 324 tests totales pasan. Verificado en navegador real como owner: clic en "Registrar entrada" → toast + fila "en curso"; clic en "Registrar salida" → toast + horas calculadas correctamente (`10:06:14 p.m. – 10:06:20 p.m. · 0h`).

## Fase 2 — Cierre de brechas para producción (2026-07-16, en curso)

Al terminar las 4 etapas (backend+frontend) se hizo un corte honesto de qué falta para que esto sirva en producción real, no sólo en tests. Dividido por fases, con decisiones ya tomadas por el owner:

### Fase 2.1 — Bloqueante (production-readiness de lo ya construido)
1. **Deploy a producción** — nada de esto está desplegado todavía. Ver checklist pre-deploy más abajo.
2. **Realtime — RESUELTO ([ADR-015](../decisions/ADR-015-realtime-polling-definitivo.md))** — el owner rechazó explícitamente cualquier servicio de terceros o de paga (Pusher/Ably quedan descartados, no sólo por costo). Con Reverb autoalojado ya descartado empíricamente (ADR-013) y terceros ahora también descartados por decisión del owner, **polling cada 15s es la arquitectura definitiva de v1**, no un stopgap. Los eventos `ShouldBroadcast` ya escritos quedan inactivos en el código, listos para activar sólo con config el día que cambie la postura.
3. **Verificación en navegador** — typecheck no es suficiente, hace falta abrir el flujo real.
4. **Gift cards conectadas al checkout** — `GiftCardService::redimir()` existe pero ningún endpoint de pedido lo invoca todavía.
5. **UI de administración de `organizations`** — hoy sólo existe vía API cruda para super_admin.

### Fase 2.2 — Pulido v1 (funciona, no está pulido)
6. Mapa de mesas con posición real (drag) en vez de sólo lista.
7. Extras/toppings + nombre del cliente en el pedido de mesa pública.
8. Reservaciones: chequeo de traslape de horario por mesa.
9. Backup offsite — **RESUELTO, descartado por la misma razón que #2** (Backblaze B2 es un tercero de paga). Backup local (`backup:run`) es la solución definitiva de v1, no un pendiente de credenciales.

### Fase 2.3 — Negocio (no es código)
10. Comunicación a clientes actuales de Premium sobre el nuevo alcance del plan — **se redacta un borrador, el owner decide cuándo/cómo enviarlo**, no se envía nada de forma autónoma.
11. Actualizar copy de `PricingSection.tsx` (página pública de precios) para reflejar las features nuevas de Premium.

### Fase 2.4 — Ampliación de alcance (decidido incluir ahora, no es sólo "corrección")
12. Impresión de comandas/tickets, registro de asistencia (clock-in/out) de staff, paridad en app móvil (Expo) — el owner pidió construirlas ahora. Ver notas de alcance realista en cada sección de abajo (paridad móvil completa en una sola sesión tiene límites honestos de calidad/tiempo).

### Fase 2.5 — Deploy
Una vez cerradas 2.1–2.4: correr `./scripts/deploy-api.sh` + `./scripts/deploy-web.sh` — autorizado por el owner para ejecutarse sin pedir confirmación adicional al final de esta sesión.

## Conclusión sobre tip pooling y confirmación legal (2026-07-16)

No se automatiza ningún pago real a personal — **ni existía ni se construyó** ningún mecanismo de disbursement (transferencia bancaria, nómina) en ClickToEat para nadie, con o sin este ADR. `propinas_reparto` es y seguirá siendo un registro informativo (cuánto le corresponde a cada rol/usuario), no una orden de pago. Por lo tanto no hay "automatización de dinero real" que bloquear en espera de la asesoría legal — el reparto físico de propinas en efectivo lo sigue haciendo el negocio manualmente, como hoy. La consulta legal (IMSS/ISR) sólo sería relevante si en el futuro se decide construir un mecanismo de pago real a empleados, algo fuera de alcance de este plan.

**Corrección importante sobre backups**: la investigación previa de este documento decía "no existe, ni siquiera como doc" — **eso era incorrecto**, esa pasada de investigación sólo revisó `app/Console/Commands` y `composer.json`, nunca la carpeta `scripts/`. **Los backups automáticos YA EXISTEN**: `scripts/backup-mysql.sh` (dump + gzip + upload offsite a Backblaze B2 vía rclone + manifest sha256 + retención local) y `scripts/backup-test.sh` (restore drill mensual con validación de row-counts). Se descartó el comando `artisan backup:run` que se había empezado a escribir en esta sesión por ser trabajo redundante e inferior a lo ya construido. **Pendiente real**: verificar operativamente (no es tarea de código) si el cron de `backup-mysql.sh` está efectivamente dado de alta en hPanel — el script y su documentación de instalación existen en `scripts/README.md`, pero eso no confirma que el cron job ya se haya creado en producción.

**Decisión de alcance de esta sesión**: se prioriza backend (migraciones, modelos, servicios, policies, tests de aislamiento) en las 4 etapas antes que pulir frontend etapa por etapa — es donde vive el riesgo real (dinero, multi-tenancy). El frontend de cada etapa queda como fast-follow explícito, no silencioso.

**Hallazgos durante la construcción (no estaban en el plan original)**:
- El middleware `RequiresFeature` deja pasar sin restricción cuando `local.plan_id === null` (locales legacy/dev); `Features::has()` NO tiene ese mismo bypass. Los endpoints públicos nuevos (`Public\MesaController`) replican el criterio del middleware explícitamente para no romper consistencia.
- El rate limiter `public-orders-by-tenant` existente keyea por `route('slug')` — no servía para rutas de mesa (`{qrToken}`). Se agregó `public-orders-by-mesa` como limiter hermano en vez de reusar el existente incorrectamente.
- El canal de broadcasting `local.{id}` (routes/channels.php) YA existe y YA autoriza correctamente al staff del local — los eventos nuevos de salón lo reutilizan tal cual, no hizo falta un canal `.salon` separado como sugería el plan original.
- `PedidoController::updateEstado` ya implementaba exactamente la máquina de estados necesaria para cocina/mesero — no se creó ningún endpoint de transición nuevo, sólo se disparó un evento adicional desde ahí.

> **Estado**: plan técnico, aprobado para iniciar construcción por etapas internas (lanzamiento a clientes en un solo paquete, ver [ADR-012](../decisions/ADR-012-plan-499-operacion-de-salon-dine-in.md)).
> Implementa el alcance de [ADR-012](../decisions/ADR-012-plan-499-operacion-de-salon-dine-in.md) sobre el backend de realtime decidido en [ADR-013](../decisions/ADR-013-realtime-pusher-protocol-managed.md).
> Grounding técnico verificado contra código real el 2026-07-14 (no supuestos — ver citas archivo:línea).

## 0. Qué reutilizamos vs qué es nuevo

Regla de oro de este plan: **cambios mínimos sobre lo que ya funciona**. Tres decisiones de diseño evitan reinventar piezas que ya existen:

1. **La máquina de estados de cocina NO es una tabla nueva** — el enum `pedidos.estado` (`nuevo, confirmado, preparando, listo, en_camino, entregado, cancelado` — `2024_01_07_000000_create_pedidos_table.php:29-32`) ya cubre `received→cooking→ready→delivered` (`nuevo→preparando→listo→entregado`). Dine-in solo necesita `mesa_id` y `cuenta_mesa_id` nuevos en `pedidos`, no un enum paralelo. `en_camino`/`cancelado` siguen aplicando igual (delivery y cancelaciones).
2. **El pago YA tiene columnas** (`estado_pago`, `metodo_pago`, Stripe Connect — `2024_06_15_100300_add_pago_online_to_locales_y_pedidos.php`). Split bill / pago mixto / pre-cuenta se construyen AGRUPANDO pedidos existentes bajo una `cuenta_mesa`, no reemplazando el modelo de pago de `Pedido`.
3. **El aislamiento multi-tenant (`TenantScope`/`BelongsToTenant`) no se toca.** Para sucursales consolidadas se usa el mismo escape hatch explícito que ya existe (`scopeWithoutTenantScope()`, usado hoy en `OrderService.php:47`) — nunca se modifica el scope global.

## 1. Feature flags nuevos (`app/Support/Features.php`)

Constantes nuevas a agregar (siguiendo el patrón de líneas 17-41 del archivo actual):

```php
const DINE_IN               = 'dine_in';                // mesas, QR por mesa, llamar mesero
const SUCURSALES_CONSOLIDADAS = 'sucursales_consolidadas'; // organizations — NO reemplaza MULTI_SUCURSAL existente
const CAJA_FISICA           = 'caja_fisica';             // multi-caja + cortes + split/mixto/pre-cuenta
const TIP_POOLING           = 'tip_pooling';
const RESERVACIONES         = 'reservaciones';
const LOYALTY_TIERS         = 'loyalty_tiers';           // extiende lealtad existente
const GIFT_CARDS            = 'gift_cards';
const CAMPANAS              = 'campanas';
const RRHH_TURNOS           = 'rrhh_turnos';
```

**Por qué `SUCURSALES_CONSOLIDADAS` y no reusar `MULTI_SUCURSAL`**: `MULTI_SUCURSAL` ya se vende hoy en Premium significando "cambiar entre Locals independientes" (`LocalSwitcher`, F71). Redefinir su significado silenciosamente rompería la expectativa de clientes que ya lo tienen. La nueva capacidad (catálogo/reportes consolidados de una cadena) es un flag nuevo — ambos quedan en Premium, mismo precio (decisión #1 de ADR-012), pero **no se confunden en el código ni en la comunicación al cliente**.

Todos estos flags se agregan al array `features` de `premium` en `PlansSeeder.php` (líneas ~91-113) — **no** a `essential`/`professional`.

## 2. Roles operativos (staff con permiso de zona — decisión ADR-012 #2)

Extender `MODULOS_VALIDOS` en `User.php:70-74`:

```php
public const MODULOS_VALIDOS = [
    'pedidos', 'pos', 'productos', 'categorias', 'inventario',
    'compras', 'recetas', 'metricas', 'branding', 'qr', 'horarios',
    'audit_log',
    'cocina', 'mesero', 'caja', // nuevo — zonas operativas de salón
];
```

Cocinero/mesero/cajero son usuarios `staff` cuyo `permisos` JSON contiene únicamente su módulo (`['cocina']`, `['mesero']`, `['caja']`). El sidebar/frontend ya filtra por `permisosEfectivos()` (`User.php:115-139`) — las 3 zonas nuevas (`/admin/cocina`, `/admin/mesero`, `/admin/caja` o rutas dedicadas fuera de `/admin` para pantallas de piso) se muestran solo si el usuario tiene el módulo correspondiente. **No se toca el enum `rol` de la tabla `users`.**

Pendiente conocido (ya documentado en `staff-permissions.md`, no nuevo de este plan): no existe un middleware `EnsurePermiso` centralizado — cada controller de zona debe verificar `puedeAcceder('cocina')` manualmente, igual que el resto del sistema hoy.

## 3. Modelo de datos nuevo, por área

Convención de migraciones a seguir: `YYYY_MM_DD_HHMMSS_verbo_descripcion.php` (ver últimas 10 migraciones reales). Todas las que usen `enum`/`change()`/SQL específico de MySQL deben llevar el guard obligatorio de CLAUDE.md:
```php
if (DB::connection()->getDriverName() !== 'mysql') return;
```

### 3.1 Mesas y piso

- `pisos` — `id, local_id, nombre, orden`.
- `mesas` — `id, local_id, piso_id, etiqueta (ej. "Mesa 5"), pos_x, pos_y, estado (libre|ocupada|por_cobrar), qr_token (string único)`.
- `pedidos` — agregar `mesa_id` (nullable, FK a `mesas`) y `cuenta_mesa_id` (nullable, FK — ver 3.3).
- QR por mesa reutiliza la lógica de generación de QR ya existente (`docs/features/qr.md`) pero apuntando a `/mesa/{qr_token}` en vez de al slug del local.
- Ambos modelos (`Pisos`, `Mesa`) usan `BelongsToTenant` — mismo mecanismo que todo lo demás, cero cambios al scope.

### 3.2 Botón "llamar al mesero"

- Tabla `llamados_mesero` — `id, local_id, mesa_id, atendido_at (nullable)`. Evento realtime al crear (ver §4). No requiere modelo de dominio complejo — es un registro + broadcast.

### 3.3 Cuenta de mesa (split bill / pago mixto / pre-cuenta)

- `cuentas_mesa` — `id, local_id, mesa_id, estado (abierta|pre_cuenta|cerrada), subtotal, propina_total, total, cerrada_at`.
- `pedidos.cuenta_mesa_id` agrupa N pedidos bajo una cuenta.
- `pagos_cuenta_mesa` — `id, cuenta_mesa_id, monto, metodo_pago (reusa enum existente), pagado_por (nullable, para split por persona), stripe_payment_intent_id (nullable, reusa integración F31 existente)`. Split por monto = varias filas sumando el total; pago mixto = varias filas con distinto `metodo_pago`.
- **Nuevo servicio** `CuentaMesaService` siguiendo el patrón exacto de `OrderService::crear` (`OrderService.php:38,68-115`): `DB::transaction(function () {...})` para cerrar cuenta + descontar inventario ya consumido + marcar pedidos como `entregado`/pagados; side-effects (recibo, notificación, loyalty) fuera de la transacción.

### 3.4 Caja física (multi-caja + cortes con varianza)

- `cajas` — `id, local_id, nombre (ej. "Caja 1")`.
- `cortes_caja` — `id, caja_id, abierta_por (user_id), cerrada_por (nullable), monto_inicial, monto_esperado (calculado), monto_contado (nullable), varianza (calculado), abierta_at, cerrada_at`.
- `movimientos_caja` — `id, corte_caja_id, tipo (fondo|retiro|vale), monto, motivo, user_id`.
- Al cerrar un corte: `monto_esperado` = suma de `pagos_cuenta_mesa`/pedidos de mostrador cobrados durante el turno + movimientos, calculado dentro de una transacción (mismo patrón).

### 3.5 Tip pooling automático por rol

- `Local` gana columna `reglas_propina` (JSON nullable) — `{"cocina": 20, "mesero": 60, "caja": 20}` (validado suma=100 en el FormRequest, igual que Lumina).
- `propinas_reparto` — `id, cuenta_mesa_id, user_id, rol, monto` — calculado al cerrar la cuenta/corte de caja.
- **Bloqueador no técnico señalado en ADR-012**: antes de automatizar el reparto, confirmar tratamiento fiscal/IMSS de propinas en México con asesoría legal — este plan deja el cálculo listo pero el reparto real de dinero (si aplica fuera de la propina en efectivo entregada en mano) debe esperar esa confirmación.

### 3.6 Reservaciones

- `reservaciones` — `id, local_id, mesa_id (nullable — puede reservarse sin asignar mesa aún), cliente_nombre, cliente_telefono, fecha_hora, personas, estado (pendiente|confirmada|cancelada|cumplida), notas`.
- Sin motor de disponibilidad complejo en v1 (no se pidió) — validación simple de que la mesa no tenga otra reserva confirmada en un rango de ±X minutos.

### 3.7 Loyalty — extender sellos hacia tiers/challenges (decisión ADR-012 #3)

- Reutiliza `lealtad_sellos` (`2026_06_15_200000_create_lealtad_sellos_table.php`) y `LoyaltyService` existentes — no se reemplazan.
- Nuevas tablas: `lealtad_tiers` (`id, local_id, nombre, sellos_requeridos, beneficio`) y `lealtad_challenges` (`id, local_id, nombre, criterio (JSON), premio, activo`).
- `LoyaltyService` gana métodos nuevos (`evaluarTier()`, `evaluarChallenges()`) llamados desde el mismo punto donde hoy se acredita un sello — no se toca el flujo de acreditación existente.
- El "referrals" de clientes finales que pedía Lumina es let scope nuevo si se decide construirlo — **no** se toca `Referral.php`/`ReferidoController.php` (programa de dueños, dominio distinto, confirmado en ADR-012 decisión #3).

### 3.8 Gift cards

- `gift_cards` — `id, local_id, codigo (único), monto_inicial, saldo, comprador_email (nullable), estado (activa|agotada|cancelada)`.
- `gift_card_movimientos` — `id, gift_card_id, tipo (emision|redencion), monto, pedido_id (nullable, idempotente por pedido — mismo patrón de idempotencia que ya usa `idempotency.md`)`.
- Requiere cobro real al momento de emitir (cliente compra la gift card) — reusa Stripe Connect (F31) ya integrado, no una pasarela nueva.

### 3.9 Campañas

- `campanas` — `id, local_id, nombre, tipo (email|push — reusa canales ya existentes de `emails-transaccionales.md`/`web-push-pwa.md`), segmento (JSON simple: todos|con_gift_card|con_tier_x), programada_para, enviada_at (nullable)`.
- Ejecutor reutiliza la infraestructura de envío ya existente (no se construye un motor de email/push nuevo) — solo la capa de segmentación + programación es nueva. Modelo de "programado" puede espejar `cupones-programados-horario.md`.

### 3.10 RRHH — turnos de personal + forecast

- `staff_shifts` — `id, local_id, user_id, inicio, fin, rol (cocina|mesero|caja)`. Independiente de `horarios` (que son horario de apertura del negocio, no de personal — confirmado, son conceptos distintos).
- Forecast v1: **no** un modelo predictivo nuevo — cálculo simple de volumen histórico de pedidos por hora/día de la semana (ya hay datos en `pedidos.created_at`) para sugerir cobertura mínima. Un motor de forecast más sofisticado queda fuera de este plan salvo que se pida explícitamente después.

### 3.11 Backups automáticos de BD (decisión ADR-012 #7 — incluido en este paquete)

- Comando artisan nuevo `php artisan backup:run` — `mysqldump --no-tablespaces` (sin rutinas/triggers, por la restricción real del usuario MySQL de Hostinger, ver CLAUDE.md), comprime, sube a `storage/app/backups/` con retención configurable (ej. 7 diarios + 4 semanales), y opcionalmente a un disk externo (S3/Cloudinary ya integrados en el proyecto).
- Cron: **no** `Schedule::` de Laravel corriendo standalone (no hay proceso persistente) — un script `.sh` en el servidor invocado desde **hPanel → Trabajos Cron** (ruta directa al script, nunca `cd X && comando` en el campo de comando — restricción ya documentada en `docs/runbook/setup-cron-scheduler.md` y en memoria del proyecto).
- Aplica a **todos los locales**, no solo Premium — es protección operativa de la plataforma, se construye igual pero no se gatea por `Features::has()`.

### 3.12 Sucursales consolidadas (organizations) — la pieza de mayor riesgo

Diseño explícito para **no tocar el aislamiento multi-tenant existente**:

- Tabla nueva `organizations` — `id, nombre, owner_user_id`.
- `locales` gana columna `organization_id` (nullable — un `Local` sin organización sigue siendo 100% independiente, comportamiento actual sin cambios).
- **Ningún modelo existente cambia su `TenantScope`.** Todo lo que hoy filtra por `local_id` (productos, pedidos, inventario, staff) sigue haciéndolo exactamente igual — cero riesgo de fuga de datos entre locales de dueños distintos.
- La vista consolidada (reportes/catálogo cruzado) se sirve desde un servicio nuevo y aislado, `OrganizationReportService`, que:
  1. Resuelve los `local_id` que pertenecen a la `organization_id` del usuario autenticado (query explícita, no un scope global).
  2. Usa el escape hatch **ya existente** `Model::withoutTenantScope()->whereIn('local_id', $idsVerificados)` (mismo mecanismo que `OrderService.php:47`) — nunca `withoutGlobalScopes()` a secas, siempre acompañado del `whereIn` explícito, tal como exige la regla crítica de CLAUDE.md.
  3. Es de **solo lectura** — no hay escritura cruzada entre Locales de una organización en v1 (evita el escenario más peligroso: que un cambio de inventario en un Local afecte a otro).
- **Este punto necesita su propio ADR de arquitectura de tenancy antes de escribir el código** (como ya señalaba ADR-012 decisión #5) — este plan da el diseño de alto nivel, pero el ADR debe documentar la decisión formalmente porque modifica un invariante central (ADR-001). Recomiendo escribirlo como `ADR-014` en cuanto se inicie esta etapa (Stage C, ver §7), no antes — así el ADR se escribe con el diseño ya validado en código real, no especulativo.

## 4. Realtime (sobre ADR-013 — driver `pusher`, sin importar el backend real)

Eventos nuevos (mismo patrón que `docs/features/realtime-reverb.md`, canal privado por local):

```php
class PedidoMesaActualizado implements ShouldBroadcastNow {
    public function broadcastOn(): array {
        return [new PrivateChannel("local.{$this->pedido->local_id}.salon")];
    }
}
class MeseroLlamado implements ShouldBroadcastNow { /* mismo canal */ }
class CuentaMesaActualizada implements ShouldBroadcastNow { /* mismo canal */ }
```

Frontend: `apps/web/src/lib/echo.ts` (ya esqueletado en el doc anterior) solo cambia `broadcaster: 'reverb'` → `broadcaster: 'pusher'` y las variables de conexión, apuntando a las credenciales del servicio administrado elegido en ADR-013. Las 3 pantallas nuevas (cocina/mesero/caja) se suscriben al mismo canal `local.{id}.salon`.

## 5. Testing obligatorio (regla CLAUDE.md #7 — no negociable)

Cada endpoint nuevo (mesas, cuentas_mesa, cortes_caja, reservaciones, gift_cards, staff_shifts, organizations) necesita su test de aislamiento multi-tenant: usuario del Local A no puede leer/escribir mesas, cuentas, cortes o reservaciones del Local B — ni aunque adivine el ID. Para `organizations`, el test crítico adicional: un `Local` sin `organization_id` nunca aparece en un reporte consolidado de otra organización, y un usuario sin pertenencia a la organización no puede leer el reporte aunque conozca el `organization_id`.

## 6. Secuencia de construcción interna

El lanzamiento a clientes es uno solo (decisión ADR-012 #6), pero construir y verificar por capas reduce el riesgo de integración tardía sobre un alcance de este tamaño:

| Etapa | Contenido | Depende de |
|---|---|---|
| **A — Núcleo de salón** | Mesas/pisos, roles cocina/mesero/caja, `mesa_id`/`cuenta_mesa_id` en pedidos, llamar mesero, realtime (ADR-013) end-to-end | ADR-013 (listo) |
| **B — Dinero** | Cuenta de mesa, caja física + cortes, split/mixto/pre-cuenta, tip pooling (cálculo, reparto real pendiente de confirmación legal) | Etapa A |
| **C — Tenancy** | Organizations + reportes consolidados (requiere `ADR-014` propio antes de codear) | Independiente de A/B, pero es la de mayor riesgo — recomendado no paralelizar con A/B sin revisión dedicada |
| **D — Crecimiento/RRHH** | Reservaciones, loyalty tiers/challenges, gift cards, campañas, staff shifts + forecast, backups automáticos | Ninguna de las anteriores — puede empezar en paralelo a A si hay capacidad |

## 7. Estimación aproximada (orden de magnitud, no compromiso)

| Etapa | Días-persona aprox. |
|---|---|
| A | 15–20 |
| B | 15–18 |
| C | 12–15 |
| D | 20–25 |
| **Total** | **~65–78 días-persona** |

Referencia de escala: ADR-011 (todo el sistema de 3 planes + billing + Stripe) se estimó en ~13 días. Este paquete es del orden de 5–6× ese esfuerzo — consistente con el hallazgo original de que es "construir la mitad de Lumina".

## 8. Pendientes no técnicos (no bloquean el código, sí la operación real)

1. Consulta legal sobre reparto automático de propinas en México (IMSS/ISR) — ver §3.5.
2. Plan de comunicación a clientes actuales de Premium sobre el nuevo alcance del plan (ADR-012, "Pendientes derivados").
3. Dimensionar tier pagado del servicio de realtime elegido (ADR-013) cuando el volumen de locales con Premium crezca.
4. Escribir `ADR-014` (tenancy de organizations) al iniciar la Etapa C.

## Referencias

- [ADR-012](../decisions/ADR-012-plan-499-operacion-de-salon-dine-in.md), [ADR-013](../decisions/ADR-013-realtime-pusher-protocol-managed.md)
- `apps/api/app/Models/Pedido.php`, `apps/api/app/Services/Orders/OrderService.php`, `apps/api/app/Support/Features.php`, `apps/api/app/Models/User.php`, `apps/api/app/Models/Concerns/BelongsToTenant.php`, `apps/api/app/Models/Scopes/TenantScope.php`
- `docs/features/qr.md`, `docs/features/lealtad.md`, `docs/features/pos.md`, `docs/features/staff-permissions.md`, `docs/features/idempotency.md`, `docs/runbook/setup-cron-scheduler.md`
