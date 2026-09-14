# Cierre de sesión — 2026-09-14

> Continuación de [`cierre-sesion-2026-09-13.md`](cierre-sesion-2026-09-13.md)
> (verificación de email + activación de CAPTCHA). Hoy se cerró el paquete de
> "pendientes" y se construyó self-service de sucursales. Detalle técnico de cada
> tema en su `.md`; esto es el índice + estado de prod + qué falta.

## Qué se hizo hoy

### 1. CAPTCHA (Turnstile) — activado en prod
Desde Chrome, sin escribir contraseñas (sesión ya autenticada). Widget "ClickToEat"
Managed, site key pública en `.env.production`, secret en `.env` de la API (inyectada
sin exponerla). Verificado: `register` sin token → 422; widget pasa en `/registro`.
Ver [`docs/security/captcha-turnstile.md`](../security/captcha-turnstile.md).

### 2. Revisión de "pendientes" → ver [`plan-fases-2026-09-14.md`](plan-fases-2026-09-14.md)
- **Gate de plan en CRUD**: ✅ **ya estaba hecho** (`EnsureActivePlan`/`plan.active`,
  cableado, `PlanActiveGateTest` 5/5). Mi listado previo estaba equivocado.
- **SMTP prod**: ✅ verificado operativo (docs que decían "caído" estaban viejos).
- **failed_job**: purgado (era un `ResumenSemanalMail` con 451 temporal, no basura).
- **Realtime**: ✅ decisión cerrada en [`ADR-017`](../decisions/ADR-017-realtime-reverb-viable-en-vps-dedicado.md)
  (polling sigue de default; Reverb ya viable en el VPS dedicado, con checklist listo,
  pero requiere OK del owner por ser daemon en VPS compartido).

### 3. Self-service de sucursales (Premium) — construido, testeado, desplegado
Owner Premium da de alta sucursales desde el panel (wizard). Hereda branding, catálogo
vacío, cubierta por el plan de la organización. Límite `max_sucursales` (Premium=5).
- Backend: `SucursalService`, `SucursalController` (`GET/POST /me/sucursales`),
  `StoreSucursalRequest`, migración `plans.max_sucursales`, gate `feature:sucursales_consolidadas`.
- Frontend: `SucursalWizard` + entry point en `LocalSwitcher`.
- Tests: `SucursalSelfServiceTest` (6) + fix de `PlanFactory::premium()` (era stub) +
  fix `assertQueued` en `CrecimientoYRrhhTest` (CampanaMail ahora ShouldQueue).
- **Suite completa: 413/413 verde.**
- Detalle: [`docs/features/sucursales-self-service.md`](../features/sucursales-self-service.md).

### 4. Exploración de n8n (para el bot de WhatsApp)
Entré a `n8n.lumiaaisolutions.com`. **Hallazgo que contradice el handoff**: la cuenta
solo tiene 2 workflows ("Cita creada → Google Calendar + Meet") y credenciales de
Google Calendar + SMTP. **No hay proveedor de WhatsApp ni el workflow de ClickToShop.**
El bot se armaría desde cero. Recomendación de proveedor gratis: **WhatsApp Cloud API
oficial** (conversaciones iniciadas por el cliente son gratis, sin riesgo de baneo) —
alternativa rápida pero riesgosa: Evolution API self-hosted. Detalle en la Fase 4 de
[`plan-fases-2026-09-14.md`](plan-fases-2026-09-14.md).

## Estado de producción al cierre

| Componente | Estado |
|---|---|
| API | ✅ desplegada, `/up` OK, migración `max_sucursales` aplicada, config con secret Turnstile |
| Web | ✅ desplegada con site key Turnstile + wizard de sucursales, health OK |
| CAPTCHA | ✅ activo y verificado |
| Verificación email | ✅ activa |
| SMTP | ✅ operativo, cola drenando |
| Self-service sucursales | ✅ en vivo (Premium=5) |

## Trabajo desplegado pero SIN COMMITEAR en git

Prod corre código que git aún no registra (se despliega por rsync del working tree).
Pendiente de commit (no se hizo porque el owner no lo pidió explícito):
- Verificación de email (sesión 09-13) — controller, notification, blade, page, banner + edits.
- CAPTCHA: site key en `.env.production`.
- Self-service sucursales: service, controller, request, migración, seeder, factory, wizard, switcher, tests.
- Todos los `.md` de estas dos sesiones.

## Qué falta (ver detalle en el mensaje de cierre / PENDIENTES.md)

1. **Commitear** lo de estas dos sesiones (prod ya lo corre).
2. **Bot n8n de WhatsApp** — bloqueado: falta elegir/conectar proveedor de WhatsApp
   (recomendado Cloud API). El workflow se arma desde cero.
3. **Paridad ClickToShop** — portar verificación, correos (splash/logo), banner,
   cero-alertas y self-service de sucursales.
4. **Backups off-site (B2)** — opcional, sin configurar.
5. Features en espera de demanda (pre-pago Stripe Connect, API pública, A/B testing,
   tracking repartidor, multi-idioma) — no construir sin cliente que las pida.
