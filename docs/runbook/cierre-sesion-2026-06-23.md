# Cierre de sesión — 2026-06-23

> Sesión dedicada a completar la app móvil ClickToEat: pantallas v1.1 → v1.3
> + super admin + capa `features/` API. Sin tocar el backend (ya en prod desde
> la sesión 2026-06-19/20) ni el frontend web.

## TL;DR

- **22 pantallas nuevas** añadidas a `apps/mobile/` (aún sin commitear).
- **18 módulos API** extraídos a `src/features/<dominio>/api.ts`.
- **2 hooks de efectos** creados: `useAuthEvents` + `usePushDeepLink`.
- Typecheck limpio en 66+ archivos TypeScript.
- **0 cambios en backend**, **0 cambios en frontend web**, **0 cambios en prod**.

## Lo que se hizo

### Bloque 1 — Capa de API por dominio (`src/features/`)

Cada dominio tiene su propio módulo `api.ts` que encapsula las llamadas
a la REST API con TanStack React Query (keys + fetchers). Todos reutilizan
la instancia `api` de `src/core/api.ts` (bearer + interceptores).

| Módulo | Endpoints |
|--------|-----------|
| `audit/api.ts` | `GET /audit-logs` (paginado) |
| `auth/useAuthEvents.ts` | Listener bus 401 → logout automático |
| `auth/usePushDeepLink.ts` | Listener notif → `playBell()` + `router.push(data.route)` |
| `categorias/api.ts` | CRUD `/categorias` + toggle activo |
| `compras/api.ts` | `GET /compras` (lista + paginado) |
| `cupones/api.ts` | `GET /cupones` + `PATCH /{id}` (toggle activo) |
| `horarios/api.ts` | `GET/PATCH /local/horarios` |
| `inventario/api.ts` | `GET /ingredientes` + `PATCH /{id}` (ajuste) + movimientos |
| `local/api.ts` | `GET/PATCH /local` (branding del local) |
| `locales/api.ts` | `GET /me/locales` + `POST /me/switch-local/{id}` |
| `notificaciones/api.ts` | `GET /notificaciones` + `POST /leer-todas` + `POST /{id}/leida` |
| `pedidos/api.ts` | `GET /pedidos` (cola en vivo) + `PATCH /{id}/estado` |
| `productos/api.ts` | `GET /productos` + `PATCH /{id}` (disponible/precio/promo) |
| `reviews/api.ts` | `GET/PATCH/DELETE /admin/reviews` |
| `search/api.ts` | `GET /search?q=…` |
| `staff/api.ts` | `GET /local/staff` |
| `super/api.ts` | locales (suspender/reactivar) + SaaS metrics + anuncios |
| `tickets/api.ts` | `GET/POST /soporte/tickets` |

### Bloque 2 — Pantallas v1.1 (catálogo + operación)

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Productos lista | `(admin)/productos/index.tsx` | Lista con búsqueda + toggle disponibilidad (optimistic update + revert on error) |
| Producto editar | `(admin)/productos/[id].tsx` | Editar nombre/precio/descripción/disponible/promoción (4 campos) |
| Categorías | `(admin)/categorias.tsx` | Lista + crear + toggle activo |
| Horarios | `(admin)/horarios.tsx` | Editor lun-dom: hora_apertura + hora_cierre + abierto + cerrado_temporal |
| Buscador | `(admin)/buscar.tsx` | Tab "Buscar" → `GET /search?q=` → resultados agrupados |
| Notificaciones | `(admin)/notificaciones.tsx` | Polling 30s + highlight no leídas + marcar 1/marcar todas |

### Bloque 3 — Pantallas v1.2 (operación completa)

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Inventario lista | `(admin)/inventario/index.tsx` | Lista con badge "Bajo stock" + filtro |
| Inventario detalle | `(admin)/inventario/[id].tsx` | Ajuste (entrada/ajuste/merma) + movimientos histórico |
| Compras | `(admin)/compras.tsx` | Lista de compras a proveedor (lectura) |
| Cupones | `(admin)/cupones.tsx` | Lista + toggle activo (optimistic update) |
| Reviews | `(admin)/reviews.tsx` | Moderación: toggle aprobado + delete |
| Staff | `(admin)/staff.tsx` | Lista con rol y permisos (lectura) |
| Branding | `(admin)/branding.tsx` | Info local + color picker (6 sugeridos + hex custom) + programa de lealtad |

### Bloque 4 — Pantallas v1.3 (avanzado)

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Tickets lista | `(admin)/tickets/index.tsx` | Lista de tickets con estado |
| Ticket nuevo | `(admin)/tickets/nuevo.tsx` | Crear: asunto, mensaje, categoría, prioridad |
| Audit log | `(admin)/audit.tsx` | Lista paginada (feature-gated 402 con CTA al panel web) |

### Bloque 5 — Super admin

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Inicio super admin | `(admin)/super/index.tsx` | Nav 3 secciones (gated por `rol === 'super_admin'`) |
| Locales | `(admin)/super/locales.tsx` | Lista + suspender/reactivar |
| SaaS metrics | `(admin)/super/metrics.tsx` | MRR, ARR, churn, conversion, distribución por plan |
| Anuncios | `(admin)/super/anuncios.tsx` | CRUD + toggle activo |

### Bloque 6 — Mejoras a pantallas existentes

| Archivo | Cambio |
|---------|--------|
| `src/app/(admin)/_layout.tsx` | Tab "Más" con 14 secciones agrupadas reemplaza tabs individuales |
| `src/app/(admin)/settings.tsx` | 5 secciones: Perfil / Sucursal / Notificaciones / Soporte / Cuenta |
| `src/app/_layout.tsx` | Monta `useAuthEvents` + `usePushDeepLink` como efectos globales |
| `src/store/auth.ts` | `refreshMe()` ahora invalida todas las queries de TanStack |
| `src/core/push.ts` | Mejorado manejo de `DeviceNotRegistered` + log silencioso |
| `src/lib/types.ts` | +12 interfaces: Horario, Cupón, Review, Staff, Ticket, AuditLog, SuperMetrics, Anuncio, etc. |

### Bloque 7 — Pantalla `switch-local.tsx`

Selector de sucursal reutilizado desde la pantalla de ajustes:
- Lista todos los locales del usuario (`GET /me/locales`)
- Muestra badge "Actual" en la sucursal activa
- `POST /me/switch-local/{id}` → recibe token nuevo → `invalidateQueries(['*'])`
- Navega de vuelta a `/(admin)/` automáticamente

## Métricas de la sesión

| Métrica | Valor |
|---------|-------|
| Archivos TypeScript nuevos | 18 features/api.ts + 22 screens + 2 hooks = **42 archivos** |
| Archivos TypeScript modificados | 6 (layout, settings, _layout, auth.ts, push.ts, types.ts) |
| Typecheck | ✅ limpio |
| Tests backend nuevos | 0 (backend no tocado) |
| Tests frontend | N/A (RN no tiene test runner configurado) |
| Cambios en producción | 0 (solo código local, sin deploy) |

## Estado después de esta sesión

```
apps/mobile/
├── src/
│   ├── app/
│   │   ├── _layout.tsx           ← monta useAuthEvents + usePushDeepLink
│   │   ├── (auth)/login.tsx      ← sin cambios
│   │   └── (admin)/
│   │       ├── _layout.tsx       ← tabs: Inicio | Pedidos | Buscar | Más
│   │       ├── index.tsx         ← Dashboard
│   │       ├── settings.tsx      ← 5 secciones expandidas
│   │       ├── switch-local.tsx  ← selector sucursal
│   │       ├── metricas.tsx      ← sin cambios
│   │       ├── audit.tsx         ← NEW (gated 402)
│   │       ├── branding.tsx      ← NEW
│   │       ├── buscar.tsx        ← NEW
│   │       ├── categorias.tsx    ← NEW
│   │       ├── compras.tsx       ← NEW
│   │       ├── cupones.tsx       ← NEW
│   │       ├── horarios.tsx      ← NEW
│   │       ├── notificaciones.tsx← NEW
│   │       ├── reviews.tsx       ← NEW
│   │       ├── staff.tsx         ← NEW
│   │       ├── inventario/       ← NEW (index + [id])
│   │       ├── pedidos/          ← existente (sin cambios)
│   │       ├── productos/        ← NEW (index + [id])
│   │       ├── tickets/          ← NEW (index + nuevo)
│   │       └── super/            ← NEW (index + locales + metrics + anuncios)
│   ├── core/
│   │   ├── api.ts                ← sin cambios
│   │   ├── secure-store.ts       ← sin cambios
│   │   ├── push.ts               ← mejorado manejo DeviceNotRegistered
│   │   └── audio.ts              ← sin cambios
│   ├── store/
│   │   └── auth.ts               ← refreshMe() + invalidateQueries
│   ├── features/                 ← NEW (18 módulos)
│   │   ├── auth/useAuthEvents.ts
│   │   ├── auth/usePushDeepLink.ts
│   │   └── <dominio>/api.ts (×16)
│   ├── design/                   ← sin cambios
│   └── lib/
│       └── types.ts              ← +12 interfaces
```

## Lo que NO se hizo (decisión consciente)

- **Upload imagen en productos** — requiere `expo-image-picker` + formData multipart. Complejidad alta, mejor en web.
- **POS en sucursal** — requiere modo offline + Idempotency-Key + selección de extras. Sprint propio.
- **Recetas** — árbol ingrediente↔producto, UI de árbol. Sprint propio.
- **Drill-down de compra** — pantalla de líneas de compra. Low usage.
- **Drill-down de ticket** — conversación + reply. Baja urgencia.
- **Migrar polling → Reverb** — evaluar batería real primero.

## Pendiente antes de publicar (solo TU acción)

| # | Acción | Tiempo |
|---|--------|--------|
| 1 | `cd apps/mobile && npx eas init` — genera `projectId` en `app.json` para push en prod | 5 min |
| 2 | Subir `assets/sounds/bell.mp3` (~0.5s mono) — sin esto la campana es no-op | 5 min |
| 3 | App icon, splash screen, fuentes Bricolage Grotesque | 1h |
| 4 | Apple Developer ($99/año) → TestFlight | 1 día |
| 5 | Google Play ($25 one-time) → internal testing | 1h |
| 6 | Configurar `EXPO_PUBLIC_API_URL` en `eas.json` con IP LAN para dev builds | 5 min |

## Acción inmediata recomendada

Commitear el trabajo mobile para no perderlo (todavía sin publicar):

```bash
cd /Users/fernandotorres/Desktop/LUMIA/clicktoeat
git add apps/mobile/ docs/
git commit -m "feat(mobile): pantallas v1.1→v1.3 + super admin + capa features/api"
git push origin main
```

## Por dónde retomar en la próxima sesión

1. Lee `docs/CONTINUAR.md` (snapshot actualizado).
2. Decidir si publicar la app o seguir añadiendo features.
3. Si publicas: `npx eas init` → `eas build --profile preview --platform all`.
4. Si añades features: pantalla de gastos (módulo Gastos ya existe en backend).

## Docs actualizados en esta sesión

| Archivo | Acción |
|---------|--------|
| `docs/features/app-movil-clicktoeat.md` | Actualizado: checkmarks v1.1-v1.3 + features/ layer |
| `docs/README.md` | Actualizado: referencias a docs de app móvil |
| `docs/runbook/cierre-sesion-2026-06-23.md` | Nuevo (este archivo) |
| `docs/CONTINUAR.md` | Actualizado: snapshot 2026-06-23 |
