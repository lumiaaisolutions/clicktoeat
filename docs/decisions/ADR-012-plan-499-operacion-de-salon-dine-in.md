# ADR-012 — Expandir el plan Premium ($499) con operación de salón (dine-in, mesas, roles operativos)

> **Estado:** aceptada — alcance y decisiones confirmadas por el owner (2026-07-14). Ver "Decisión". Bloqueador de infraestructura (realtime) resuelto en [ADR-013](ADR-013-realtime-pusher-protocol-managed.md). Pendiente: ADR de tenancy para sucursales consolidadas + plan técnico detallado (ver "Siguiente paso").
> **Fecha:** 2026-07-14.
> **Decisores:** Owner del proyecto.
> **Origen:** comparación contra el sistema hermano "Lumina" (POS de restaurante con salón físico), a pedido del owner.

## Contexto

ClickToEat hoy vende 3 planes (`essential` $99, `professional` $299, `premium` $499 — ver [ADR-011](ADR-011-saas-pricing-and-feature-gating.md)), posicionados como "ya vendo por WhatsApp" → "opero mi local" → "escalo mi negocio". El modelo de negocio actual es **pickup / delivery / venta de mostrador** (`metodo_entrega`: `pickup`, `delivery`, `sucursal`) — no existe ningún concepto de mesa física, salón, ni consumo en sitio con servicio a mesa.

El owner pidió portar a ClickToEat un conjunto de módulos de "Lumina" (POS de restaurante con salón: QR por mesa, cocina/mesero/caja, reservaciones, etc.) y que esto se venda dentro del plan Premium ($499).

**Punto crítico**: el plan Premium ($499) **ya existe** y ya tiene un alcance definido (POS de mostrador, audit log, métricas avanzadas, inventario, `multi_sucursal` = cambiar entre Locals independientes). Lo solicitado no es una feature más — es esencialmente construir la mitad de lo que Lumina *es* (operación de salón completa con mesas, roles de piso, caja física, turnos). Esto cambia drásticamente lo que "$499" significa hoy para los suscriptores actuales de Premium.

## Alcance solicitado (textual, 2026-07-14)

1. Flujo por mesa vía QR con estados `received→cooking→ready→delivered→paid` y máquina de estados de dominio.
2. Roles operativos: cocinero, mesero, cajero (con sus propias zonas de UI) — no solo owner/staff genérico.
3. Sucursales + mapa de mesas por piso (drag & drop).
4. Botón "llamar al mesero".
5. Reservaciones.
6. Multi-caja física simultánea + cortes de caja con varianza.
7. Split bill (por monto/personas), pago mixto, pre-cuenta — "a la par con los cobros que ya se hacen".
8. Tip pooling automático por rol.
9. Fidelización/marketing: loyalty (tiers, challenges, referrals), cupones, campañas, gift cards.
10. RRHH: turnos de personal + labor scheduling con forecast.
11. Seguridad/ops: 2FA TOTP para admins, papelera con soft-delete recuperable, audit log, backups automáticos de BD.

## Mapeo contra lo que YA existe hoy (verificado en código, no en docs viejos)

| # | Pedido | Estado real hoy | Evidencia |
|---|--------|------------------|-----------|
| 1 | Mesa + QR + estados cocina | **No existe.** Cero concepto de mesa física en BD/código. El QR actual es único por local, apunta a la landing pública, no a una mesa. | `docs/features/qr.md`, ausencia total de `mesa_id` en `Pedido` |
| 2 | Roles cocinero/mesero/cajero | **No existe.** BD tiene `rol` enum (`super_admin`, `owner`, `staff`) + permisos granulares por módulo (`permisos` JSON) para `staff`, pero sin roles operativos de piso ni UI dedicada por rol. | `apps/api/app/Models/User.php` |
| 3 | Sucursales + mapa de mesas | **Parcial, y no es lo mismo.** Ya existe `LocalSwitcher` (F71): un `User` cambia entre `Local`s 100% independientes (cada uno su propio catálogo/inventario/staff). Es multi-cuenta, no multi-sucursal de una cadena. El modelo "real" de sucursales consolidadas (`organizations`, plan Business $799) está **solo documentado, sin código** (`docs/features/multi-sucursal.md`). El mapa de mesas por piso es 100% nuevo — depende de que exista el concepto de mesa (#1). | `docs/features/multi-sucursal-detalle.md` vs `docs/features/multi-sucursal.md` |
| 4 | Llamar al mesero | **No existe.** Depende de #1 y #2. | — |
| 5 | Reservaciones | **No existe**, confirmado por ausencia total en el repo. | — |
| 6 | Multi-caja + cortes de caja | **No existe.** `docs/features/pos.md` lista explícitamente "sin cierre de caja" entre sus limitaciones. Cero modelos/migraciones de caja. | `docs/features/pos.md` |
| 7 | Split bill / pago mixto / pre-cuenta | **No existe tal cual**, pero hay base parcial: `Pedido` ya tiene `estado_pago` (pendiente/pagado/fallido/reembolsado) y `metodo_pago` (efectivo/tarjeta_entrega/tarjeta_tpv/transferencia), más pago online real vía Stripe Connect (`stripe_account_id` en `Local`, `stripe_payment_intent_id` en `Pedido`, feature F31). Split/mixto/pre-cuenta necesitan agrupar **varios pedidos de una misma mesa en una cuenta**, concepto que hoy no existe (cada pedido es su propia unidad de cobro). | migración `2024_06_15_100300_add_pago_online_to_locales_y_pedidos.php` |
| 8 | Tip pooling | **No existe**, ni concepto de propina en absoluto. | — |
| 9a | Cupones | **Ya implementado y vendido.** CRUD, validación pública, lock pesimista. | `docs/features/cupones.md`, `app/Models/Cupon.php` |
| 9b | Loyalty (sellos) | **Ya implementado**, pero es "sellos" simples, no tiers/challenges. | `docs/features/lealtad.md`, `LoyaltyService` |
| 9c | Referrals | **Ya implementado — pero es OTRA COSA.** El "programa de referidos" actual es B2B: dueños de locales refieren a otros dueños para crecer el SaaS (recompensa vía Stripe Coupon). Lumina habla de referrals de **clientes finales** del restaurante (fidelización). Son dominios distintos con el mismo nombre. | `app/Models/Referral.php`, `app/Http/Controllers/Api/ReferidoController.php` |
| 9d | Campañas / Gift cards | **No existe ninguno de los dos.** | — |
| 10 | Turnos de personal + forecast | **No existe.** Lo que existe (`docs/features/horarios.md`) son horarios de **apertura/cierre del negocio**, no turnos de empleados — son conceptos distintos con nombre parecido. | `app/Support/HorarioCalculator.php` |
| 11a | 2FA TOTP | **Ya implementado**, disponible hoy (verificar en qué plan(es) está gateado). | `TwoFactorController`, `User.php` |
| 11b | Papelera/soft-delete | No confirmado todavía — pendiente de verificar en una siguiente pasada si aplica. | — |
| 11c | Audit log | **Ya implementado y vendido** en Premium hoy (`feature:audit_log`). | `AuditLog.php`, `AuditLogger.php` |
| 11d | Backups automáticos BD | **No existe, ni siquiera como doc.** Gap operativo real, independiente de este ADR. | confirmado por ausencia en `Console/Commands` y `composer.json` |

**Conclusión del mapeo**: de los 11 puntos pedidos, prácticamente todo lo que es "operación de salón" (mesas, roles de piso, caja, propinas, reservas, turnos) es **100% nuevo** — no hay nada que reciclar. Lo que ya existe (cupones, lealtad, referidos, 2FA, audit log) son features de **otro dominio** (crecimiento del SaaS / fidelización simple), que ya se venden hoy en Premium — pedir "agregarlos" al $499 no aplica porque ya están ahí.

## Restricciones de infraestructura relevantes (de CLAUDE.md, no derivables del pedido)

- Producción corre en **Hostinger VPS con CageFS** (sin Docker, sin sudo, sin procesos persistentes propios fuera de LSPHP/Passenger). Hoy notificaciones usan **polling de 30s** — Reverb/WebSockets está solo documentado (`docs/features/realtime-reverb.md`, "skeleton, NO instalado"), no hay `laravel/reverb` en `composer.json`. Un flujo cocina→mesero→caja en "tiempo real" típicamente se construye con WebSockets; aquí probablemente tenga que ser con polling salvo que se decida invertir en infra nueva.
- El usuario MySQL de Hostinger no tiene `SUPER`/`RELOAD` — cualquier backup automático debe usar `mysqldump --no-tablespaces` sin rutinas/triggers, vía cron `.sh` (el ejecutor de cron de hPanel no soporta shell compleja — ver `docs/runbook/setup-cron-scheduler.md`).

## Cosas que pueden complementar esto (sugeridas, no pedidas)

- **Impresión de tickets/comandas** — sin esto, cocina/caja con mesas físicas se siente incompleto (Lumina no lo tiene resuelto tampoco, es un hueco común en este tipo de sistemas).
- **Registro de horario (clock-in/out) del personal** — prerrequisito real para que "turnos + forecast" tenga sentido; hoy no hay ninguna noción de asistencia de empleados.
- **Estado de mesa visible** (libre/ocupada/por cobrar) en el mapa de piso — complemento natural del mapa de mesas.
- **Resiliencia offline** en pantallas de cocina/mesero (conexión Wi-Fi de restaurante no siempre estable) — ya hay un antecedente aspiracional (`pos-offline.md`) sin UI, mismo gap aplicaría aquí.
- **Implicación legal de propinas** (tip pooling) en México — IMSS/ISR sobre propinas tiene reglas específicas; vale la pena una consulta legal antes de automatizar el reparto, no solo una decisión de producto.
- **Plan de comunicación a clientes actuales de Premium** — si se redefine qué incluye el plan de $499, hay que decidir qué pasa con quienes ya lo pagan hoy bajo la promesa actual (POS + audit log + métricas).

## Decisión

Confirmado por el owner (2026-07-14):

1. **Precio**: este alcance se agrega **dentro del Premium actual ($499)**, sin crear un tier nuevo. El Premium existente queda redefinido — pendiente decidir comunicación a suscriptores actuales (ver "Pendientes derivados").
2. **Tiempo real**: se invierte en **WebSockets desde el inicio** (no polling) para el flujo cocina/mesero/caja. **Resuelto en [ADR-013](ADR-013-realtime-pusher-protocol-managed.md)**: se verificó empíricamente que Reverb autoalojado no es viable en el hosting actual (puerto no alcanzable desde afuera) — se usa un servicio administrado compatible con protocolo Pusher (Pusher Channels/Ably), sin cambiar nada del código de aplicación planeado.
3. **Loyalty/referrals**: se **extiende el módulo de lealtad existente** (sellos → tiers/challenges), no se crea uno paralelo. El "referrals" pedido es de clientes finales del restaurante (fidelización) — el programa de referidos de dueños (B2B, crecimiento del SaaS) sigue existiendo tal cual, sin tocarlo.
4. **Cuenta de mesa**: se crea el concepto nuevo (`cuenta_mesa` o equivalente) que agrupa N pedidos de una misma mesa para split bill / pago mixto / pre-cuenta, conviviendo con Stripe Connect (pago online) y los métodos POS existentes (`efectivo`/`tarjeta_tpv`/`transferencia`).
5. **Sucursales**: se construye el modelo de **sucursales reales consolidadas** (catálogo/inventario/reportes de una cadena bajo un mismo tenant lógico) — no solo el mapa de mesas de un Local suelto. Esto es lo que hoy `docs/features/multi-sucursal.md` describe como "solo documentado, sin código" (antes pensado para un plan Business $799 separado) y **amplía el modelo de tenancy actual de ADR-001** (single-db, un tenant = un `Local` independiente). Requiere su propio ADR de arquitectura de tenancy antes de tocar esquema.
6. **Fases**: **todo se lanza junto**, sin entregar subconjuntos al cliente en el camino.
7. **Backups automáticos de BD**: se incluyen dentro del alcance de este ADR-012 (aunque conceptualmente protegen a LUMIA más que ser un beneficio exclusivo de quien paga Premium).

## Riesgo agravado (a tener en cuenta, no bloquea la decisión ya tomada)

La combinación elegida es la de **mayor riesgo posible** de las opciones evaluadas:

- **Sucursales reales consolidadas** cambia el modelo de tenancy fundamental del sistema (ADR-001) — hoy TODO el código (`TenantScope`, políticas, `BelongsToTenant`) asume "un tenant = un Local aislado". Introducir reportes/inventario consolidado entre Locales de una misma cadena es la clase de cambio que, si se hace mal, **rompe el aislamiento multi-tenant** que CLAUDE.md marca como regla crítica innegociable.
- ~~Reverb/WebSockets desde el día 1 añade una pieza de infraestructura nueva...~~ **Resuelto**: [ADR-013](ADR-013-realtime-pusher-protocol-managed.md) confirma que Reverb self-hosted no es viable (verificado empíricamente) y adopta un servicio administrado compatible con protocolo Pusher — sin proceso persistente propio, sin cambios de firewall.
- **"Todo junto, un solo lanzamiento"** sobre un alcance de este tamaño (equivalente a construir la mitad de Lumina) sin entregas intermedias verificables eleva mucho el riesgo de integración tardía. *Recomendación que mantengo aunque no bloquea*: aunque el lanzamiento al cliente sea uno solo, conviene construir y verificar internamente por capas (esquema de mesas/roles → caja/cuentas → Reverb → loyalty/RRHH/gift cards) para poder detectar problemas temprano, sin que eso signifique exponer nada a producción antes de tiempo.

## Siguiente paso

Plan técnico detallado ya escrito: [`features/plan-499-operacion-salon-implementacion.md`](../features/plan-499-operacion-salon-implementacion.md) — modelos/migraciones, feature flags, secuencia de construcción interna (4 etapas) y estimación. Pendiente antes de tocar código: escribir `ADR-014` de tenancy para sucursales consolidadas al iniciar la Etapa C de ese plan.

## Referencias

- [ADR-011 — SaaS pricing y feature gating](ADR-011-saas-pricing-and-feature-gating.md)
- [`features/pos.md`](../features/pos.md), [`features/multi-sucursal.md`](../features/multi-sucursal.md), [`features/lealtad.md`](../features/lealtad.md), [`features/realtime-reverb.md`](../features/realtime-reverb.md)
- [`ia-features.md`](../features/ia-features.md) — comparación original contra Lumina que originó este pedido
