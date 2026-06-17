# Pendientes — lista única de verdad

> Estado al **2026-06-17 cierre de sesión**.
> Esta es la fuente única de verdad sobre qué falta hacer. Si está acá,
> está pendiente. Si NO está acá, ya está hecho.

## 🔴 Bloqueantes

**Ninguno.** El sistema está 100% operativo en LIVE.

## 🟧 Solo TU acción (no requiere código)

### 1. Activar backup diario en Hostinger
- **Por qué**: sin esto pierdes hasta 7 días de datos si algo se rompe.
- **Cómo**: hPanel → VPS → Backups → Add-on Daily backups ($6/mes).
- **Tiempo**: 2 min.
- **Cuándo**: hacerlo antes de tener clientes reales pagando.

### 2. Revocar la MCP restricted key de Stripe
- **Por qué**: limpieza. La restricted key con prefijo `rk_live_51TPnLAR...` (creada el 2026-06-16, MCP de Stripe) solo se usó una vez para configurar producción. Ya no se necesita.
- **Cómo**: dashboard.stripe.com → Developers → API keys → Restricted keys → fila `rk_live_...` → 3 puntos → **Revoke key**.
- **Tiempo**: 1 min.

### 3. Probar el flow end-to-end con tarjeta real (recomendado)
- **Por qué**: validar al 100% que cuando llegue un cliente real, funciona sin sustos.
- **Cómo**:
  1. https://clicktoeat.lumiaaisolutions.com/registro con un email distinto al tuyo (ej. `tu+test@gmail.com`)
  2. Elige Premium
  3. Mete tu tarjeta real → Stripe te muestra "trial · $0 due today"
  4. Completas el wizard
  5. Llegas al panel → crea 2-3 productos de prueba
  6. Vas a `/admin/billing` → **cancelas** antes del día 14 → cargo = $0
- **Tiempo**: 15 min.

## 🟨 Features documentadas pero NO implementadas

Estos NO son bugs ni faltantes — son ideas futuras con plan listo. **No
las construyas a menos que un cliente las pida** (regla: no construir sin
demanda).

### App móvil React Native + Expo
- **Doc**: `docs/features/app-movil-clicktoeat.md`
- **Para qué**: "tablet en cocina" con sonido + push notifications nativas
- **Cuándo conviene**: cuando tengas 50+ locales pagando
- **Esfuerzo estimado**: 5-7 días + cuenta Apple Developer ($99/año) + Google Play ($25 one-time)
- **Tiene prompt listo** en el doc para generar la app

### API pública para integradores
- **Doc**: `docs/features/api-publica-y-ab-testing.md`
- **Para qué**: que ERPs, Zapier, etc. consuman/escriban datos
- **Cuándo conviene**: cuando un cliente real la pida
- **Esfuerzo estimado**: 5 días (UI tokens + Swagger público + webhook outgoing UI)

### A/B testing de menú
- **Doc**: `docs/features/api-publica-y-ab-testing.md`
- **Para qué**: probar 2 versiones del menú (precio/foto/descripción) y ver cuál vende más
- **Cuándo conviene**: cuando un local tenga >50 pedidos/día (suficiente tráfico para significancia estadística)
- **Esfuerzo estimado**: 1+ semana (o usar GrowthBook/Flagsmith externos)

### Pre-pago Stripe Connect (cobro al cliente final)
- **Sin doc específico** (mencionado en sesiones previas)
- **Para qué**: cliente paga el pedido online ANTES de que se prepare (vs WhatsApp + paga al entregar)
- **Por qué no se hizo**: requiere que cada owner haga onboarding Stripe Connect (KYC, datos bancarios) — muchos no podrán
- **Esfuerzo estimado**: 5-7 días

### Tracking de repartidor en mapa
- **Sin doc específico**
- **Para qué**: el cliente ve en tiempo real dónde va su pedido
- **Cuándo conviene**: cuando un local tenga repartidor propio
- **Esfuerzo estimado**: 3-4 días + app móvil para el repartidor

### Multi-idioma de landing
- **Sin doc específico**
- **Para qué**: zonas turísticas (Playa del Carmen, CDMX centro)
- **Esfuerzo estimado**: 3-4 días (i18n + traducciones del owner)

## 🔵 Configuración opcional (no urgente)

### Activar QUEUE_CONNECTION=database
- **Doc**: `docs/runbook/activar-queue-database.md`
- **Cuándo conviene**: cuando un newsletter va a >200 destinatarios y demora >30s
- **Cómo**: cambiar 1 línea del `.env` + agregar cron `queue:work` cada minuto

## ✅ Lo que YA está implementado y funcionando

(Lista completa en `docs/CONTINUAR.md` y `docs/runbook/estado-final-junio-2026.md`)

Resumen: **todo el sistema** — Stripe LIVE, Mail, Sentry, 8 módulos super_admin,
panel owner completo, onboarding rediseñado, reviews, cupones por horario,
auto-pause stock, POS offline, centro de aprendizaje, tours, 9 mailables
editables, grace period locales, 2 crons, 185/185 tests verde.

## 🔚 Próxima sesión: por dónde retomar

Cuando vuelvas:

1. Lee este archivo (`PENDIENTES.md`) primero.
2. Lee `docs/CONTINUAR.md` para tener contexto.
3. Si la sesión tiene un objetivo nuevo (no algo de esta lista), dímelo directo.
4. Si vamos a implementar una de las features documentadas, lee primero su `docs/features/*.md` para entender el plan.

**Mi recomendación**: no abras sesión nueva solo para "implementar features".
Abre sesión cuando:
- Un **cliente real te pida** algo específico
- **Algo se rompa** en producción y haya que arreglar
- Hayan **>= 10 locales pagando** y quieras analizar qué falta priorizar

Antes de eso = optimización prematura.
