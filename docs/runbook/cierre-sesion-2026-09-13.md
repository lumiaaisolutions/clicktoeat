# Cierre de sesión — 2026-09-13

> Bitácora cronológica de la sesión. El detalle técnico de cada feature vive en su
> `.md` respectivo (enlazado abajo); este documento es el índice + estado de prod.

## Resumen ejecutivo

Sesión larga que cerró tres frentes grandes en **producción**:

1. **Rediseño integral del panel admin + operación de salón** (UI/UX, botones,
   confirmaciones, tours, auditoría, caja, mesero, reviews, sucursales, íconos).
2. **Sistema de correo unificado** (diseño ClickToEat, splash + logo, correo del
   cliente obligatorio, seguimiento de pedido, correos en cola) + **verificación
   de correo doble opt-in**.
3. **CAPTCHA (Cloudflare Turnstile) ACTIVADO en producción** — de código dormido a
   protección real en login/registro.

Todo desplegado y verificado en vivo. Frontend (`clicktoeat-web` PM2) y API
(`clicktoeat-api`) con health check OK tras cada deploy.

---

## 1. Rediseño de panel + operación de salón

Ya documentado y commiteado durante la sesión. Bloques y commits:

- **Panel/acciones**: fix del portal del Select, shell, toasts (reemplazo de
  `sileo`), botones Edit/View/Delete-hold/Create/ActionButton, `ConfirmDialog`,
  wizard en modales, métricas interactivas, pulido del landing.
- **Auditoría** agrupada por día + descripciones humanas (sin contexto técnico). — `7607705`
- **Sucursales**: "Abrir solicitud de soporte" ahora crea un ticket real.
- **Reviews**: al abrir una reseña se ve el cliente completo + detalle de venta +
  cuántas veces ha pedido. — `f13c198`
- **Caja**: panel explicado, todos los botones diseñados, historial de pago,
  confirmación antes de cobrar, y **quién cobró cada pedido**. — `2b66961`, `3049d65`
- **Mesero**: atribución a lo largo de punto-venta / mesas / caja + preset de rol
  "Mesero". — `f2aa090`
- **Tours**: nuevos + wire de tours huérfanos + tutorial de caja. — `9a7a198`
- **+26 íconos de categoría** nuevos.

## 2. Sistema de correo + verificación

- **Correo unificado ClickToEat**: layout base compartido (`mail/layout.blade.php`),
  correo del cliente **obligatorio** en pedidos de landing, seguimiento de pedido
  (`PedidoEstadoMail`), recibo de pago. — `e21c9c0`
  - Detalle: [`docs/features/correos-sistema-unificado.md`](../features/correos-sistema-unificado.md)
- **Splash suave (durazno→crema) + logo ClickToEat** (mark PNG transparente +
  wordmark), tras feedback de que la franja naranja saturaba. — `6bf5516`
- **Correos en cola** (`ShouldQueue` + `QUEUE_CONNECTION=database`), drenados por el
  scheduler cada minuto (`queue:work --stop-when-empty`), sin worker persistente
  (VPS compartido). — `6e93de1`
- **Ficha de cliente unificada** por email **y** teléfono (`orWhere`). — `6e93de1`
- **Cero alertas nativas**: se eliminaron los últimos `alert()`/`confirm()` del
  sistema (2 en onboarding) → banners/toasts/`ConfirmDialog` diseñados.
- **SMTP configurado**: `MAIL_USERNAME=fernando@lumiaaisolutions.com` (buzón
  primario; los `clicktoeat@`/`contacto@`/`noreply@` son **alias** que no pueden
  autenticar SMTP). Password inyectada al `.env` de prod sin exponerla.

### Verificación de correo (doble opt-in) — **nuevo hoy, en prod**

Confirmación **suave, no bloqueante**: al registrarse se encola un correo con
enlace firmado (60 min); el panel muestra un banner ámbar "Confirma tu correo"
con botón Reenviar hasta que se confirme. No es un gate duro — el onboarding sigue.

- Backend: `User implements MustVerifyEmail`, `VerifyEmailNotification` (ShouldQueue,
  URL firmada), `EmailVerificationController` (`verify` público por firma + `resend`
  autenticado), `register()` la dispara.
- Frontend: página `/correo-verificado` (éxito/inválido) + `EmailVerificationBanner`
  montado en el layout del panel.
- Verificado en prod: ruta `verify` → **403** con firma inválida (correcto),
  `/correo-verificado` → **200**.
- Detalle completo: [`docs/features/verificacion-email.md`](../features/verificacion-email.md)

## 3. CAPTCHA (Cloudflare Turnstile) — **ACTIVADO en producción hoy**

El código estaba desde sept 2026 pero dormido (no-op sin llaves). Hoy se activó:

- Widget **"ClickToEat"** (modo *Managed*) creado en la cuenta Cloudflare de LUMIA
  (`Nando.torres0987@gmail.com`), hostnames `clicktoeat.lumiaaisolutions.com` + `localhost`.
- **Site key** (pública `0x4AAAAAAEyNM0h4DgGXGxIi`) → `apps/web/.env.production` → rebuild + deploy web.
- **Secret key** → solo en `apps/api/.env` de prod (inyectada por SSH sin exponerla) → `config:cache`.
- Verificado en vivo:
  - API: `register` sin token → `422 { code: CAPTCHA_REQUIRED }`.
  - Frontend: widget renderiza y pasa el challenge ("Success!") en `/registro`.
- Comportamiento: registro exige token **siempre**; login solo tras **≥3 fallos**.
- Detalle: [`docs/security/captcha-turnstile.md`](../security/captcha-turnstile.md)

---

## Estado de producción al cierre

| Componente | Estado |
|---|---|
| API (`clicktoeat-api`) | ✅ desplegada, health `/up` OK, config cacheada con secret Turnstile |
| Web (`clicktoeat-web`, PM2) | ✅ desplegada con site key Turnstile, health OK |
| Correo | ✅ Verificado en prod (2026-09-14): `MAILER=smtp`, host Hostinger, buzón primario `fernando@`, password vigente (15 chars), cola `database` drenando (0 pendientes). 1 `failed_job` histórico de los intentos de debug SMTP — no crítico |
| CAPTCHA | ✅ activo y verificado |
| Verificación de email | ✅ activa (depende de que el correo salga → ver punto de MAIL_PASSWORD) |

## Pendiente al cierre

1. **Paridad ClickToShop** — portar lo de esta sesión (verificación de email,
   splash+logo de correos, banner, cero-alertas-nativas, rediseño de panel).
   Ver [`docs/PENDIENTE-PARIDAD-CLICKTOSHOP.md`](../PENDIENTE-PARIDAD-CLICKTOSHOP.md).
2. **Realtime websockets** — decisión abierta. ADR-015 dejó polling 15s como
   definitivo; en el VPS dedicado Reverb self-hosted ya sería viable, pero es un
   daemon nuevo en VPS compartido → requiere OK del owner. Recomendación: quedarse
   en polling salvo queja real de latencia.
3. **Backups off-site (B2)** — opcional, sin configurar (el backup local corre 03:00 UTC).
4. **MAIL_PASSWORD en prod** — confirmar vigencia para que los correos (incluida la
   verificación recién desplegada) salgan de la cola.

## Trabajo sin commitear al momento de escribir este cierre

Verificación de email (controller, notification, blade, page, banner, edits a
User/AuthController/routes/layout/auth.ts), site key en `.env.production`, y estos
docs. Pendiente de commit.
