# Pendientes — lista única de verdad

> Estado al **2026-06-23** (post app móvil v1.1→v1.3 + super admin + features/api).
> Esta es la fuente única de verdad sobre qué falta hacer. Si está acá,
> está pendiente. Si NO está acá, ya está hecho.

## 🚨 URGENTE — borrar tokens expuestos en chat

1. **GitHub PAT** `ghp_v3Is3PKLT9...` — revocar en https://github.com/settings/tokens
2. **Hostinger API token** `l05wCls...0dc61` — revocar en https://hpanel.hostinger.com/api

## 🔴 Bloqueantes

**Ninguno crítico.** Sitio web está sirviendo (bundle viejo Jun 18 sin
hardening del audit). API está sirviendo CON hardening completo. Ningún
cliente afectado, pero el web está pendiente de re-deploy con el fix
sileo `5d2cdc5` después de aplicar las env vars de Capa 1 abajo.

## ✅ SEV-12 cerrado completo (2026-06-22)

Los 13 controllers del audit están autorizados (4 con Policy nueva +
9 con inline auth verificada). 5 commits locales pendientes de push:

```
c5f64ee  docs(api): marcar inline auth en Billing/Upload/Push (13/13 ✅)
0af3489  docs(api): marcar inline auth como intencional en 5 controllers (9/13)
b9c1fd3  security(api): authorize en ReviewController admin (4/13)
8624ee4  security(api): authorize en HorarioController + LocalController.update (3/13)
b47dea6  security(api): autorización explícita en CuponController (1/13)
```

**Para push** (mi `git push` falló por credenciales del macOS keychain):

```bash
cd /Users/fernandotorres/Desktop/LUMIA/clicktoeat
git push origin main
```

Si te pide credenciales, usa tu personal access token GitHub o configura
SSH para el remote.

## 🟧 Solo TU acción (no requiere código)

### 1. Aplicar env vars en Passenger (Capa 1 — NPROC fix) ⚡
- **Por qué**: el deploy del web crasheó con `pthread_create: Resource temporarily unavailable` (NPROC limit de CloudLinux LVE). El bundle nuevo necesita menos threads/proceso para entrar.
- **Tiempo**: 3-5 min.
- **Dos caminos** — elige el que prefieras:

  **Camino A — hPanel UI** (oficial):
  - hPanel → Hosting → `clicktoeat.lumiaaisolutions.com` → Node.js → Environment variables
  - Agrega: `UV_THREADPOOL_SIZE=2`, `NODE_OPTIONS=--max-old-space-size=512`, `NEXT_TELEMETRY_DISABLED=1`
  - Save → Restart

  **Camino B — SSH + `Passengerfile.json`** (rápido, versionable):
  ```bash
  ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
  cat > ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/Passengerfile.json <<'EOF'
  {
    "envvars": {
      "UV_THREADPOOL_SIZE": "2",
      "NODE_OPTIONS": "--max-old-space-size=512",
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
  EOF
  touch ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/tmp/restart.txt
  exit
  ```

- **Verifica**: `curl -sI https://clicktoeat.lumiaaisolutions.com/ | head -3` debe seguir 200.
- **Detalle**: [`docs/runbook/aplicar-env-vars-passenger.md`](runbook/aplicar-env-vars-passenger.md) + [`docs/infra/passenger-node-tuning.md`](infra/passenger-node-tuning.md).

### 2. Re-deploy del web con el fix sileo (tras aplicar #1)
- **Por qué**: el web está sirviendo el bundle pre-audit. Falta meter Sileo (toasts), DOMPurify (preview email), Sentry mask, Next 14.2.35, CSP headers.
- **Cómo**:
  ```bash
  cd /Users/fernandotorres/Desktop/LUMIA/clicktoeat
  git push origin main          # commit abe0a07 (docs)
  ./scripts/deploy-web.sh       # build + tar + scp + restart + health
  curl -sI https://clicktoeat.lumiaaisolutions.com/ | head -10
  ```
- **Tiempo**: 10-15 min.
- **Si vuelve a 503**: NO es nuestro código — es NPROC. Pasar a #3.

### 3. (Solo si #2 falla) Pedir aumento NPROC a Hostinger
- **Por qué**: Capa 1 no fue suficiente.
- **Cómo**: ticket en hPanel:
  > "Mi app Next.js en `clicktoeat.lumiaaisolutions.com` está crasheando con
  > `pthread_create: Resource temporarily unavailable`. Cuenta `u221820910`.
  > Ya apliqué `UV_THREADPOOL_SIZE=2` + `--max-old-space-size=512`.
  > ¿Pueden aumentar el NPROC limit a 200?"
- **Tiempo**: 1 min ticket + ~24-48h respuesta.

### 4. Restringir Google Maps API key (SEV-8 del audit)
- **Por qué**: la key está commiteada en `apps/web/.env.production` (pública por ser `NEXT_PUBLIC_*`). Si no tiene restricciones, cualquiera consume tu cuota.
- **Cómo**: Google Cloud Console → APIs & Services → Credentials → la key activa:
  - Application restrictions: HTTP referrers → `https://*.lumiaaisolutions.com/*`
  - API restrictions: solo Maps JavaScript + Places + Geocoding (las que uses)
- **Tiempo**: 5 min.

### 4b. Borrar API token Hostinger expuesto (URGENTE — 5 seg)
- **Por qué**: el 2026-06-20 compartiste el token `l05wCls...0dc61` en chat
  para que el agente probara el API. Quedó en el transcript persistente +
  en `.claude/settings.local.json` (gitignored, pero si por error se
  commitea queda en git history). Aunque expira en 1 mes, mejor revocarlo
  YA.
- **Cómo**: https://hpanel.hostinger.com/api → token "clicktobarber" →
  **Regenerate** (o icono de basura → confirm).
- **Verifica** que devuelve 401 después:
  ```bash
  curl -sI -H "Authorization: Bearer l05wCls...0dc61" \
    https://developers.hostinger.com/api/vps/v1/virtual-machines
  # Esperado: HTTP/2 401
  ```

### 5. ~~Activar backup diario en Hostinger~~ ✅ YA ACTIVO
- **Verificado 2026-06-20 via API Hostinger** — backups diarios corriendo:
  - 2026-06-20 04:34Z ✓
  - 2026-06-13 04:41Z ✓
  - 2026-06-06 04:48Z ✓
  - 2026-05-30 07:21Z ✓
- **Para listar via API en el futuro**:
  ```bash
  curl -s -H "Authorization: Bearer $HAPI" \
    https://developers.hostinger.com/api/vps/v1/virtual-machines/1698236/actions \
    | jq '.data[] | select(.name == "backup_create")'
  ```

### 6. Revocar la MCP restricted key de Stripe
- **Por qué**: limpieza. La restricted key con prefijo `rk_live_51TPnLAR...` ya no se necesita.
- **Cómo**: dashboard.stripe.com → Developers → API keys → Restricted keys → Revoke.
- **Tiempo**: 1 min.

### 7. Probar el flow end-to-end con tarjeta real
- **Por qué**: validar al 100% que cuando llegue un cliente real funciona sin sustos.
- **Cómo**:
  1. https://clicktoeat.lumiaaisolutions.com/registro con email distinto al tuyo
  2. Elige Premium
  3. Mete tu tarjeta real → Stripe te muestra "trial · MXN 0.00 due today"
  4. Completas el wizard, llegas al panel, creas 2-3 productos
  5. `/admin/billing` → cancelas antes del día 14 → cargo = $0
- **Tiempo**: 15 min.

### 8. (Opcional) Validar el cron `trials:expire-manual` en prod
- **Por qué**: confirmar que el nuevo cron corre diario 10:30am.
- **Cómo**: el cron maestro `* * * * * php artisan schedule:run` ya existe
  en hPanel. Para verificación manual:
  ```bash
  ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
  cd domains/clicktoeat-api.lumiaaisolutions.com/public_html
  php artisan schedule:list   # debería listar expire-manual-trials a las 10:30
  php artisan trials:expire-manual   # corrida manual de prueba
  ```
- **Tiempo**: 3 min.

## 📱 App móvil ClickToEat — solo TU acción

La app está construida (`apps/mobile/`, 66 archivos TypeScript, typecheck
limpio). Lo que sigue es solo lo que el código no puede hacer.

### Bloqueantes para correr la app en device real (~10 min total)

#### 1. `npx eas init`
- **Por qué**: registra el proyecto y escribe `projectId` en `app.json`.
  Sin esto `getExpoPushTokenAsync` falla y no hay push en builds de prod.
- **Cómo**:
  ```bash
  cd apps/mobile
  npx eas login       # crea cuenta gratuita en expo.dev si no tienes
  npx eas init
  ```
- **Tiempo**: 5 min.

#### 2. Subir asset `assets/sounds/bell.mp3`
- **Por qué**: la campana al llegar pedido nuevo es no-op silencioso sin este archivo.
- **Spec**: MP3 ~0.5s, mono, 44.1 kHz, <50 KB.
- **Dónde**: `apps/mobile/assets/sounds/bell.mp3`.
- **Sugerencia**: freesound.org → buscar "bell notification short".
- **Tiempo**: 5 min.

### Bloqueantes solo cuando vayas a publicar (~$124/año primer año)

#### 3. Cuenta Apple Developer Program
- **Costo**: $99 USD/año.
- **Cómo**: https://developer.apple.com/programs/enroll/
- **Tiempo**: 24-48 h verificación.
- **Después**: crear app en App Store Connect con `bundleIdentifier: com.lumia.clicktoeat`
  → copiar App Store Connect App ID → pegar en `apps/mobile/eas.json` reemplazando `REEMPLAZAR_CON_APP_STORE_CONNECT_ID`.

#### 4. Cuenta Google Play Console
- **Costo**: $25 USD one-time.
- **Cómo**: https://play.google.com/console
- **Tiempo**: inmediato.

#### 5. Privacy policy URL para App Store Connect
- **Reusar**: `https://clicktoeat.lumiaaisolutions.com/privacidad`
- **Dónde**: App Store Connect → App Information → Privacy Policy URL.

### Assets de marca (no bloqueante, no urgente)
- `assets/images/icon.png` — 1024×1024 PNG
- `assets/images/splash-icon.png` — 200×200 PNG transparente
- `assets/images/android-icon-foreground.png` + background + monochrome (1024×1024)
- `assets/fonts/BricolageGrotesque-Bold.ttf` — Google Fonts (gratis)

### Runbook completo
[`docs/runbook/arrancar-app-movil.md`](runbook/arrancar-app-movil.md).

## 🟣 Roadmap del security audit — Estado al 2026-06-22

### ✅ Bloques rojo + naranja + amarillo CERRADOS

- 17 de 18 hallazgos resueltos en código.
- SEV-6, SEV-12, SEV-18 todos cerrados completos en sesiones del audit.

### 🔵 Bloque azul — Plan ejecutable, sin código

- **SEV-2 — token localStorage → cookie HttpOnly**:
  Spec completo + diseño + plan de despliegue + trade-offs en
  [`docs/decisions/ADR-010-token-localStorage-to-httponly-cookie.md`](decisions/ADR-010-token-localStorage-to-httponly-cookie.md).
  Sprint dedicado de 5-7 días. **Es el último hallazgo crítico abierto.**

- **WAF + CDN Cloudflare**: arquitectura defensiva. Necesita decisión de
  plan CF (Free vs Pro). 2-3 días de implementación.

- **Turnstile invisible login**: cierra el último 15% de SEV-10. 4h
  cuando tengas keys de Cloudflare.

Reporte completo: [`docs/security/auditoria-integral-2026-06-19.md`](security/auditoria-integral-2026-06-19.md).

## 💚 Sesión 2026-06-23 — App móvil completada (pendiente commit)

Trabajo local sin deployar. Backend no tocado. 0 cambios en prod.

### App móvil — v1.1 → v1.3 + super admin + capa features/

- ✅ 18 módulos `src/features/<dominio>/api.ts` (capa API por dominio)
- ✅ 2 hooks de efectos: `useAuthEvents` (401→logout) + `usePushDeepLink` (notif→deep-link)
- ✅ Pantallas v1.1: Productos (lista+editar) · Categorías · Horarios · Buscador · Notificaciones
- ✅ Pantallas v1.2: Inventario (lista+detalle+ajuste) · Compras · Cupones · Reviews · Staff · Branding
- ✅ Pantallas v1.3: Tickets (lista+crear) · Audit log (gated 402)
- ✅ Super admin (gated `super_admin`): Locales · SaaS metrics · Anuncios
- ✅ Mejoras: `_layout.tsx` (menú "Más" 14 secciones) · `settings.tsx` (5 secciones)
- ✅ Typecheck limpio en 66+ archivos TypeScript

Docs actualizados:
- [`docs/features/app-movil-clicktoeat.md`](features/app-movil-clicktoeat.md) (checkmarks v1.1→v1.3)
- [`docs/runbook/cierre-sesion-2026-06-23.md`](runbook/cierre-sesion-2026-06-23.md) (nuevo)
- [`docs/CONTINUAR.md`](../CONTINUAR.md) (snapshot 2026-06-23)
- [`docs/PENDIENTES.md`](../PENDIENTES.md) (este archivo)

**Próximo paso**: `git add apps/mobile/ docs/ && git commit && git push origin main`

---

## 💚 Sesión 2026-06-22 (continuación) — TODO desplegado en prod

Trabajo posterior al cierre original de hoy. Commit `a809f0c` + push +
deploy api/web verificado.

### Módulo Gastos operativos + extensiones
- ✅ Tabla `gastos` + CRUD multi-tenant + 9 tests originales
- ✅ Refresh de identidad: rojo `#FF2D2D` → naranja `#F26A1F` en CSS var,
  Tailwind, favicon, manifest, Logo component (cursor naranja + "Eat" naranja),
  bulk replace en 35+ archivos
- ✅ Logo PNG en `/login` y landing hero (next/Image priority)
- ✅ Upload de comprobantes (img/pdf 5MB) — POST/DELETE `/v1/gastos/{id}/comprobante`
- ✅ Export CSV con UTF-8 BOM — GET `/v1/gastos/export`
- ✅ Utilidad neta en `/admin/metricas` — endpoint `/v1/metricas/utilidad` +
  gráfico dual-line + tabla de margen %
- ✅ Cron `gastos:check-recurrentes` (daily 09:30) — notifica si gasto
  recurrente lleva >35 días sin nuevo registro
- ✅ SEV-19 (`Route [login] not defined` → 500) fixed con stub en `routes/web.php`

**Tests:** 259/259 verde (240 previos + 19 nuevos).

Docs creadas/actualizadas:
- [`docs/features/gastos-operativos.md`](features/gastos-operativos.md) (extendido)
- [`docs/api/gastos.md`](api/gastos.md) (nuevo — endpoints completos)
- [`docs/database/schema.md`](database/schema.md) (tabla gastos agregada)
- [`docs/runbook/cron-gastos-recurrentes.md`](runbook/cron-gastos-recurrentes.md) (nuevo)
- [`docs/security/sev-19-route-login-missing.md`](security/sev-19-route-login-missing.md) (nuevo)

### 🟡 Pendiente local (no urgente, no en prod)

- **`apps/mobile/` sin commitear**: la app completa (v1.0→v1.3 + super admin)
  sigue en local. Sesión 2026-06-23 añadió 22 pantallas nuevas + 18 módulos
  `features/api.ts`. Commit recomendado:
  ```bash
  git add apps/mobile/ docs/
  git commit -m "feat(mobile): pantallas v1.1→v1.3 + super admin + features/api"
  git push origin main
  ```
  El backend de push fan-out YA está en prod (commit `bffb908`).
  La app móvil necesita su propio commit + decisión cuándo publicar a stores.

- **TRIAL_MANUAL_DAYS=15 en prod `.env`**: memoria del proyecto menciona
  que ClickToBarber lo necesita. Verificar si aplica a ClickToEat y si
  ya está aplicado en `apps/api/.env` de prod (default es 14).
  Comando para revisar:
  ```bash
  ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
    "grep TRIAL_MANUAL_DAYS ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env || echo 'NO SETEADO'"
  ```

### 🔵 Mejoras opcionales detectadas (no son bugs)

- **Pantalla de Gastos en la app móvil** — hoy el módulo es solo web.
  Trivial portar (mismo endpoint, mismos campos, sin lógica nueva).
- **Cron en TZ MX**: el `Schedule->at('09:30')` corre en UTC. Si se
  quiere que sea 09:30 hora MX, agregar `->timezone('America/Mexico_City')`
  en `bootstrap/app.php`. Aplica también al resto de jobs.
- **Export XLSX nativo**: si el contador prefiere xlsx, agregar
  `phpoffice/phpspreadsheet` y un segundo endpoint `/v1/gastos/export.xlsx`.
- **Alerta auto-crecimiento de gastos**: notif si gastos del mes
  crecen >20% vs mismo mes año anterior. Útil pero no urgente.

## 🟨 Features documentadas pero NO implementadas

Estos NO son bugs ni faltantes — son ideas futuras con plan listo.
**No las construyas a menos que un cliente las pida** (regla: no
construir sin demanda).

### App móvil React Native + Expo — ✅ MVP backend + frontend implementado (2026-06-19)
- **Backend**: `MobileDeviceController`, `MobileDevice` model, migración
  `2026_06_19_120000_create_mobile_devices_table.php`, `ExpoPushSender`,
  `PushDispatcher`, rutas `/mobile/register-device` y `/mobile/unregister-device`.
- **App** (Expo SDK 56): `apps/mobile/` con secure token storage, NativeWind,
  push handler con 409 graceful.
- **Doc**: `docs/features/app-movil-clicktoeat.md`
- **Lo que falta**: build final + alta en App Store y Google Play
  (Apple $99/año + Google $25 one-time).

### API pública para integradores
- **Doc**: `docs/features/api-publica-y-ab-testing.md`
- **Para qué**: que ERPs, Zapier, etc. consuman/escriban datos
- **Cuándo conviene**: cuando un cliente real la pida
- **Esfuerzo**: 5 días

### A/B testing de menú
- **Doc**: `docs/features/api-publica-y-ab-testing.md`
- **Cuándo conviene**: local con >50 pedidos/día
- **Esfuerzo**: 1+ semana (o usar GrowthBook/Flagsmith externos)

### Pre-pago Stripe Connect (cobro al cliente final)
- **Para qué**: cliente paga el pedido online ANTES de que se prepare
- **Por qué no se hizo**: requiere onboarding Stripe Connect del owner (KYC bancario)
- **Esfuerzo**: 5-7 días

### Self-service alta de sucursales
- **Doc**: `docs/features/pos-listas-tours-sucursales-emails-auditoria-2026-06-18.md`
- **Para qué**: que owners Premium puedan dar de alta sucursales nuevas sin pedir a soporte
- **Backend ya soporta multi-local nativamente** — solo falta la UI de alta
- **Cuándo conviene**: cuando algún cliente Premium con cadena lo pida explícitamente
- **Esfuerzo**: 2-3 días

### Tracking de repartidor en mapa
- **Sin doc específico**
- **Cuándo conviene**: local con repartidor propio
- **Esfuerzo**: 3-4 días + app móvil para el repartidor

### Multi-idioma de landing
- **Sin doc específico**
- **Cuándo conviene**: zonas turísticas (Playa del Carmen, CDMX centro)
- **Esfuerzo**: 3-4 días

## 🔵 Configuración opcional (no urgente)

### Activar QUEUE_CONNECTION=database
- **Doc**: `docs/runbook/activar-queue-database.md`
- **Cuándo conviene**: cuando un newsletter va a >200 destinatarios y demora >30s
- **Cómo**: cambiar 1 línea del `.env` + agregar cron `queue:work` cada minuto

## ✅ Lo que YA está implementado y funcionando

(Resumen — lista completa en `docs/CONTINUAR.md` y `docs/runbook/estado-final-junio-2026.md`)

**Sesiones recientes (junio 2026)** añadieron:

- Stripe LIVE + 3 planes + webhook + trial 14d
- Mail SMTP + 9 mailables editables (con UI sin etiquetas técnicas)
- Sentry Laravel + Next.js
- 8 módulos super_admin (resumen, locales, SaaS, anuncios, cupones globales, newsletter, soporte, zonas, **auditoría timeline**, emails, **editar usuarios**)
- Panel owner completo + onboarding rediseñado
- Reviews públicas + cupones por horario + auto-pause stock
- Centro de aprendizaje con SVG + tours interactivos + **botón "Volver a ver tutoriales"**
- POS offline + **POS con modal cantidad/extras + dropdown categoría**
- Lista de pedidos como cards visuales con avatares + botón borrar con doble confirmación
- Sidebar admin organizado en bloques + **Sucursales con candado**
- Branding con **toggle delivery** + color picker hex + tipografía global
- Ticket POS con branding + descarga PNG + impresión 80mm térmica
- Link de calificación con WhatsApp deeplink + on-demand creation
- Referidos verificado end-to-end con `RefCapture` + 4 tests
- Landing principal con **orbs interactivos** + mobile fix PinnedFoodStory
- 2 crons activos: nudge emails + **expirar trials manuales**
- **194/194 phpunit verde**
- **Stripe respeta trial_end al activar** local existente (no cobra inmediato)

## 🔚 Próxima sesión: por dónde retomar

Cuando vuelvas:

1. Lee este archivo (`PENDIENTES.md`) primero.
2. Lee `docs/CONTINUAR.md` para tener contexto.
3. Si la sesión tiene un objetivo nuevo (no algo de esta lista), dímelo directo.
4. Si vamos a implementar una de las features documentadas, lee primero su `docs/features/*.md` para entender el plan.

**Mi recomendación**: no abras sesión nueva solo para "implementar
features". Abre sesión cuando:

- Un **cliente real te pida** algo específico
- **Algo se rompa** en producción y haya que arreglar
- Hayan **≥10 locales pagando** y quieras analizar qué falta priorizar

Antes de eso = optimización prematura.
