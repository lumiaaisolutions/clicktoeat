# Plan por fases — cierre de pendientes 2026-09-14

> Documento vivo para no perder el hilo. Cada fase dice: **qué es**, **qué se hace**,
> **qué se necesita** y **estado**. Marca ✅ al cerrar.

## Resumen

De los 5 puntos que se revisaron hoy, **3 ya estaban resueltos o se cerraron en esta
sesión** y **2 son features nuevas que requieren tu input/luz verde** (no se
construyen sin demanda, regla del proyecto). Detalle abajo.

---

## ✅ Fase 1 — Gate server-side de "plan activo" (YA ESTABA HECHO)

**Qué era**: el miedo de que un local con plan `canceled`/vencido pudiera seguir
creando pedidos/productos pegándole a la API directa (saltándose el bloqueo del
frontend `PlanInactiveScreen`).

**Hallazgo**: **ya está implementado, cableado y testeado.** No era un pendiente —
mi listado anterior estaba equivocado (no lo verifiqué en su momento).

- Middleware `App\Http\Middleware\EnsureActivePlan` (alias `plan.active`).
- **Cableado** en el grupo tenant: `routes/api.php:206` →
  `Route::middleware(['auth:sanctum', 'tenant', 'plan.active'])`.
- Política: GETs siempre pasan; escrituras → **402 `PLAN_INACTIVE`** si el plan no
  está activo; allowlist para billing/ajustes/`me`/soporte (para poder reactivar);
  super_admin y locales sin `plan_id` (pre-SaaS) pasan.
- Test: `tests/Feature/Billing/PlanActiveGateTest.php` — **5/5 verde**.

**Nota (posible futuro, NO es bug)**: las escrituras `public/*` (pedidos del
comensal desde el landing) **no** pasan por este gate — es otro concern. Si algún
día se quiere "apagar el landing público cuando el plan vence", es una feature
aparte, no parte de este gate.

## ✅ Fase 2 — SMTP en prod + failed_job (CERRADO HOY)

- **SMTP verificado operativo** (`smtp`, host Hostinger, buzón primario `fernando@`,
  password vigente 15 chars, cola `database` drenando). Los docs que decían
  "`MAIL_MAILER=log`/caído" estaban desactualizados → corregidos.
- **failed_job purgado** (`queue:flush`, 0 restantes). **Aclaración**: no era basura
  de debug — era un `ResumenSemanalMail` real a `pstitch@clicktoeat.com` que falló
  con **451 4.3.0 (temporal, tipo greylisting)**, no rebote duro. Como el resumen se
  regenera cada semana, purgarlo no pierde nada crítico.

## ✅ Fase 3 — Realtime websockets (DECISIÓN CERRADA → ADR-017)

Se documentó formalmente en [`ADR-017`](../decisions/ADR-017-realtime-reverb-viable-en-vps-dedicado.md):

- **Decisión**: polling 15s sigue siendo el default. No se activa Reverb de forma
  unilateral (daemon nuevo en VPS compartido → requiere OK del owner).
- Pero se registró que **ya es viable y barato** en el VPS dedicado (la razón que lo
  bloqueaba —puerto inalcanzable— desapareció con la migración) + un **checklist de
  activación listo para ejecutar** (~medio día, reversible) el día que se apruebe.
- **Gatillo recomendado**: cuando un local se queje del retraso, o cuando el polling
  cargue el servidor al crecer los locales.

Deja de ser un "cabo suelto": es una decisión explícita con plan listo.

---

## 🟡 Fase 4 — Bot n8n de WhatsApp (ClickToEat) — REQUIERE ACCESO A n8n

**Qué es**: hoy los pedidos entran por el deep-link `wa.me` (mensaje pre-armado que
el comensal manda al local). El "bot" sería un flujo en **n8n** que, cuando un
cliente escribe por WhatsApp, un LLM (Ollama, ya self-hosted) interpreta el pedido y
lo **registra automáticamente** en ClickToEat vía API. ClickToShop **ya tiene** su
workflow armado; ClickToEat no.

**Qué falta (según el handoff)**:
1. El nodo **IF/Code/HTTP** en n8n que haga `POST` al endpoint de pedidos cuando el
   LLM marca `pedido_listo`, con el JSON correcto (incluyendo `producto_id`).
2. Un **JSON base del workflow** versionado en el repo (hoy no existe).

**Qué haría yo**:
- Adaptar el workflow de ClickToShop al dominio de ClickToEat (endpoints, catálogo,
  copys) y exportar su JSON al repo (`docs/features/` o `n8n/`).
- Definir/confirmar el endpoint que consume el bot: hoy existe `POST /pedidos` (POS,
  autenticado, dentro del grupo tenant) y `POST public/pedidos/{slug}` (landing,
  público). El bot probablemente necesita **un endpoint dedicado con token de
  servicio** (no reusar el de sesión de usuario ni el público sin control) — a
  decidir en el diseño.

**Qué necesito de ti**:
- **Acceso al n8n** donde vive el workflow de ClickToShop (para clonarlo/adaptarlo).
  El bot **no se puede construir solo desde este repo** — la lógica vive en la
  instancia de n8n, no en el código de Laravel/Next.
- Confirmar el **número de WhatsApp** y el proveedor por el que entra el mensaje al
  n8n (Evolution API / WhatsApp Cloud / el que uses en ClickToShop).
- Decisión sobre el **endpoint + auth** del bot (recomiendo endpoint dedicado con
  token de servicio).

**Estado**: ⏸️ bloqueado. **Hallazgo (2026-09-14, con acceso a n8n)**: la cuenta de
`n8n.lumiaaisolutions.com` **NO tiene** ningún workflow de WhatsApp ni de pedidos.
Solo hay 2 workflows ("Cita creada → Google Calendar + Meet + confirmación") y
credenciales de Google Calendar + SMTP. **No hay proveedor de WhatsApp configurado**
(ni Evolution API, ni WhatsApp Cloud, ni Twilio) y nada compartido. Es decir: el
supuesto del handoff ("ClickToShop ya tiene el workflow listo") **no se cumple en
esta cuenta** — el bot se armaría desde cero, y el primer bloqueante es **elegir y
conectar un proveedor de WhatsApp** (ver recomendación abajo).

### Recomendación de proveedor de WhatsApp (sin pagar)

1. **WhatsApp Cloud API (Meta, oficial) — RECOMENDADO.** Las conversaciones
   *iniciadas por el cliente* (service conversations) son **gratis** — y ese es
   justo el caso del bot (el comensal escribe primero). Cero riesgo de baneo, node
   nativo en n8n. Costo real = **fricción de setup** (verificar Meta Business + un
   número **dedicado** que no se use en la app normal de WhatsApp).
2. **Evolution API (self-hosted) — alternativa rápida pero riesgosa.** Gratis, corre
   en tu VPS (ya tienes Docker), usa un número normal (escaneas QR como WhatsApp
   Web). Pero es **no oficial** (protocolo WhatsApp Web) → Meta puede **banear el
   número**. No recomendable para un número del que dependan clientes.

**Sugerencia**: Cloud API para producción; Evolution solo para prototipar.

## ✅ Fase 5 — Self-service alta de sucursales — HECHO (2026-09-14)

**Implementado y testeado** con defaults defendibles (el owner dio luz verde con
"hazlo" sin fijar reglas). Detalle: [`docs/features/sucursales-self-service.md`](../features/sucursales-self-service.md).

- Backend: `plans.max_sucursales` (Premium=5), `SucursalService`, `SucursalController`
  (`GET/POST /me/sucursales`), `StoreSucursalRequest`, gate `feature:sucursales_consolidadas`.
- Frontend: `SucursalWizard` + entry point "Agregar sucursal" en `LocalSwitcher`.
- Defaults: owner Premium, hereda branding, catálogo vacío, cubierta por el plan de la org.
- Tests: `SucursalSelfServiceTest` (6, verde) + fix de `PlanFactory::premium()`.

### Scope original (referencia)

**Qué es**: hoy un owner con cadena que quiere una sucursal nueva tiene que pedirlo a
soporte; un **super_admin** la crea (`POST admin/locales`). Self-service = que el
propio owner **Premium** dé de alta sucursales desde su panel, sin soporte.

**Estado del backend**: multi-local ya es nativo (tenancy por organización, ADR-014;
`me/locales`, `me/switch-local`, `feature:sucursales_consolidadas`). Lo que falta es
la **capa owner-facing**:
- Un **endpoint nuevo** owner-scoped para crear una sucursal dentro de **su** org
  (distinto del `admin/locales` que es super_admin), gateado por
  `feature:sucursales_consolidadas` + límite del plan.
- La **UI**: wizard de alta (nombre, slug, WhatsApp, branding heredado o nuevo) +
  gestión desde el switcher de sucursales existente.

**Qué necesito de ti**:
- **Luz verde** — es una feature de 2-3 días y la regla del proyecto es no construir
  sin demanda real. ¿Hay un cliente Premium con cadena pidiéndola? Si sí, la hago.
- Reglas de negocio: ¿cuántas sucursales por plan? ¿la sucursal nueva hereda branding
  y catálogo del local padre o arranca vacía? ¿cuenta contra algún límite de plan?

**Estado**: ⏸️ esperando luz verde + reglas de negocio.

---

## Tablero

| Fase | Qué | Estado |
|---|---|---|
| 1 | Gate de plan en CRUD | ✅ ya estaba hecho + testeado |
| 2 | SMTP + failed_job | ✅ cerrado hoy |
| 3 | Realtime (decisión) | ✅ ADR-017 |
| 4 | Bot n8n WhatsApp | ⏸️ requiere acceso a n8n |
| 5 | Self-service sucursales | ✅ hecho + testeado (2026-09-14) |
