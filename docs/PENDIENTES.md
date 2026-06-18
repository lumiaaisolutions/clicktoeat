# Pendientes — lista única de verdad

> Estado al **2026-06-18 cierre de sesión**.
> Esta es la fuente única de verdad sobre qué falta hacer. Si está acá,
> está pendiente. Si NO está acá, ya está hecho.

## 🔴 Bloqueantes

**Ninguno.** El sistema está 100% operativo en LIVE. El ciclo
trial → cobro automático está cerrado end-to-end con tests verde.

## 🟧 Solo TU acción (no requiere código)

### 1. Activar backup diario en Hostinger
- **Por qué**: sin esto pierdes hasta 7 días de datos si algo se rompe.
- **Cómo**: hPanel → VPS → Backups → Add-on Daily backups ($6/mes).
- **Tiempo**: 2 min.
- **Cuándo**: hacerlo antes de tener clientes reales pagando.

### 2. Revocar la MCP restricted key de Stripe
- **Por qué**: limpieza. La restricted key con prefijo `rk_live_51TPnLAR...` ya no se necesita.
- **Cómo**: dashboard.stripe.com → Developers → API keys → Restricted keys → Revoke.
- **Tiempo**: 1 min.

### 3. Probar el flow end-to-end con tarjeta real
- **Por qué**: validar al 100% que cuando llegue un cliente real funciona sin sustos.
- **Cómo**:
  1. https://clicktoeat.lumiaaisolutions.com/registro con email distinto al tuyo
  2. Elige Premium
  3. Mete tu tarjeta real → Stripe te muestra "trial · MXN 0.00 due today"
  4. Completas el wizard, llegas al panel, creas 2-3 productos
  5. `/admin/billing` → cancelas antes del día 14 → cargo = $0
- **Tiempo**: 15 min.

### 4. (Opcional) Validar el cron `trials:expire-manual` en prod
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

## 🟨 Features documentadas pero NO implementadas

Estos NO son bugs ni faltantes — son ideas futuras con plan listo.
**No las construyas a menos que un cliente las pida** (regla: no
construir sin demanda).

### App móvil React Native + Expo
- **Doc**: `docs/features/app-movil-clicktoeat.md`
- **Para qué**: "tablet en cocina" con sonido + push notifications nativas
- **Cuándo conviene**: cuando tengas 50+ locales pagando
- **Esfuerzo**: 5-7 días + Apple $99/año + Google Play $25 one-time

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
