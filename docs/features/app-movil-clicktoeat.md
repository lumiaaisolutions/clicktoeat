# App móvil ClickToEat — plan de implementación

> Estado: en desarrollo activo (2026-06-19).
> Bootstrap inicial bajo `apps/mobile/`. Objetivo: paridad funcional con
> el panel web (`apps/web/`) en iOS + Android desde un único codebase.

## Decisiones aplicadas (2026-06-20)

| Decisión | Elección | Por qué |
|---|---|---|
| Web push vs móvil | **Conviven (parallel)** | El `PushDispatcher` hace fan-out a ambos. Cero riesgo de regresión para owners que ya tienen el PWA en el navegador. |
| Realtime en v1.0 | **Polling 10s (no Reverb todavía)** | Menos riesgo, menos infra. Reverb se evalúa en v1.1 cuando ya haya feedback de batería real en kioscos. |
| v1.1 arranque | **Productos quick-toggle** (disponibilidad + precio) | 1 día de trabajo, valor inmediato para el owner. El catálogo completo viene en v1.2. |
| OTA updates | **Activado** (`expo-updates` + `runtimeVersion: appVersion`) | Empujar fixes JS sin pasar por App Store ahorra ~3 días de espera por release. |
| Push token | **Único por user_id + token** (SEV-11) | El token Expo no es secreto; reasignación silenciosa permitía silenciar al owner real. Backend responde 409 si otro user reclama el mismo token. |

## Decisión de stack

**React Native + Expo (SDK 51+) con Expo Router + NativeWind + Zustand**.

Razones:
- **Cross-platform** — iOS y Android desde un único codebase TypeScript.
- **Reuso de patrones del web** — axios, zustand, types, lógica de cart y WhatsApp
  se traducen casi 1:1 desde `apps/web/`.
- **Expo Router** — routing por archivos (estilo Next.js App Router).
- **NativeWind** — Tailwind nativo, mismas utility classes que el web.
- **Builds firmados** con `eas build` sin requerir Xcode/Android Studio local.
- **Push** — Expo Notifications maneja APNs (iOS) y FCM (Android) detrás de la misma API.

Descartado: **Swift/SwiftUI nativo + Kotlin/Jetpack Compose nativo**.
Aunque ofrece mejor rendimiento y feel nativo, duplicaría todo el esfuerzo
(dos codebases para 25+ secciones). Si en el futuro alguna pantalla
crítica necesita verdadero nativo, RN permite módulos nativos puntuales.

## Estructura

```
apps/mobile/
├── app/                       # Expo Router (rutas por archivo)
│   ├── _layout.tsx           # root stack + providers
│   ├── (auth)/               # grupo: login, signup, forgot-password
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (admin)/              # grupo autenticado (panel del local)
│   │   ├── _layout.tsx       # bottom tabs
│   │   ├── index.tsx         # dashboard
│   │   ├── pedidos/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── productos/
│   │   ├── categorias/
│   │   ├── inventario/
│   │   ├── compras/
│   │   ├── cupones/
│   │   ├── lealtad/
│   │   ├── metricas/
│   │   ├── reviews/
│   │   ├── staff/
│   │   ├── horarios/
│   │   ├── branding/
│   │   ├── notificaciones/
│   │   └── settings/
│   └── (super)/              # grupo super_admin (locales, anuncios, tickets, etc.)
├── src/
│   ├── core/
│   │   ├── api.ts            # axios instance + bearer + interceptor 401/402
│   │   ├── secure-store.ts   # wrapper expo-secure-store (token)
│   │   ├── push.ts           # registro APNs/FCM via expo-notifications
│   │   └── audio.ts          # campana al llegar pedido nuevo
│   ├── store/                # zustand: auth, plan, cart, livePedidos, notif
│   ├── lib/
│   │   ├── types.ts          # espejado de apps/web/src/lib/types.ts
│   │   ├── whatsapp.ts       # espejo de apps/web/src/lib/whatsapp.ts
│   │   └── utils.ts
│   ├── design/
│   │   ├── tokens.ts         # #FAFAF7, #FF2D2D, #0B0B0F, Bricolage, etc.
│   │   └── components/       # Button, Input, Card, Badge, Modal, Sheet…
│   └── features/             # lógica por dominio (hooks + servicios)
│       ├── pedidos/
│       ├── productos/
│       ├── inventario/
│       └── ...
├── assets/                   # fuentes, sonidos, splash, app icon
├── app.json                  # config Expo (ios, android, plugins)
├── eas.json                  # perfiles de build (dev, preview, prod)
├── package.json
└── tsconfig.json             # strict, paths: @/*
```

## Dependencias

Runtime:
- `expo`, `expo-router`, `expo-secure-store`, `expo-notifications`, `expo-av`,
  `expo-keep-awake`, `expo-font`, `expo-image`, `expo-clipboard`
- `axios`
- `zustand`
- `@tanstack/react-query`
- `react-hook-form`, `zod`, `@hookform/resolvers`
- `nativewind` + `tailwindcss`
- `react-native-reanimated`
- `react-native-svg`
- `date-fns`
- `react-native-mmkv` (cache rápido) — opcional

Dev:
- TypeScript estricto
- `eslint-config-expo`
- `prettier`

## Reuso del backend (sin cambios destructivos)

La app consume la API REST existente en
`https://clicktoeat-api.lumiaaisolutions.com/api/v1`.

| Operación | Endpoint reusado |
|---|---|
| Login | `POST /auth/login` (acepta 2FA con `otp`) |
| `me` | `GET /auth/me` |
| Logout | `POST /auth/logout` |
| Multi-sucursal | `GET /me/locales`, `POST /me/switch-local/{id}` |
| Pedidos cola | `GET /pedidos?estado=nuevo,confirmado,preparando` |
| Cambio estado | `PATCH /pedidos/{id}/estado` |
| Productos | `apiResource /productos` |
| Categorías | `apiResource /categorias` |
| Inventario | `apiResource /ingredientes` + ajuste + movimientos |
| Compras | `/compras` (gated) |
| Métricas | `GET /metricas` |
| Cupones | `apiResource /cupones` |
| Reviews | `/admin/reviews` |
| Notif | `GET /notificaciones` + `leer-todas` |
| Staff | `apiResource /local/staff` |
| Branding | `GET/PATCH /local`, `GET/PATCH /local/horarios` |
| Búsqueda Cmd+K | `GET /search?q=…` |
| Anuncios banner | `GET /anuncios/activos` |
| Tickets soporte | `/soporte/tickets` |
| Audit logs | `/audit-logs` (Premium) |
| Uploads | `POST /uploads/image` |

### Cambios mínimos en backend (sólo para push móvil)

1. Tabla `mobile_devices` (migration nueva):
   ```
   id, user_id (fk), local_id (fk nullable), platform ('ios'|'android'),
   expo_push_token (unique), device_name, last_seen_at, created_at, updated_at
   ```
2. Endpoint `POST /api/v1/mobile/register-device` (Sanctum auth + tenant scope).
3. Extender `App\Services\Push\WebPushSender` → `PushDispatcher` que ramifique
   web push vs Expo Push API (`https://exp.host/--/api/v2/push/send`).
4. Test multi-tenant del endpoint (regla 7 del CLAUDE.md).

## Fases de paridad

### v1.0 — MVP "cocina + pedidos" (semana 1)
- Login (con 2FA)
- Bottom tabs: Pedidos / Métricas / Notif / Settings
- Cola de pedidos en vivo (polling 10s + push)
- Detalle de pedido con cambio de estado
- Sonido + vibración al llegar pedido nuevo
- Keep-awake (modo cocina)
- Multi-sucursal switcher
- Logout

### v1.1 — Catálogo + operación (semana 2)
- Productos (lista, ver, editar disponibilidad, editar precio, subir imagen)
- Categorías (lista + reorder)
- Horarios (editar)
- Métricas (resumen + serie diaria + top productos)
- Notificaciones in-app
- Buscador global (`/search`)

### v1.2 — Operación completa (semana 3)
- Productos full (crear, editar todo, extras/toppings)
- Inventario (ingredientes + ajustes + movimientos)
- Compras a proveedor
- Cupones (CRUD + toggle)
- Reviews (moderación)
- Staff (gestión equipo)
- Branding (logo, colores, tipografía)
- Lealtad

### v1.3 — Avanzado (semana 4)
- POS (pedido en sucursal, modo offline opcional)
- Recetas (asociación ingrediente↔producto)
- Tickets de soporte
- Audit log (Premium)
- Centro de aprendizaje
- Webhooks outgoing (Premium)
- Programa de referidos

### v2.0 — Super admin (semana 5+)
- Listado / suspender / reactivar locales
- SaaS metrics (MRR/ARR/churn)
- Anuncios globales
- Cupones globales (sync)
- Newsletter
- Tickets globales
- Email templates editables
- Audit log global
- Métricas por zona

### Fuera del scope móvil (mejor en web)
- Onboarding completo con upload de logo y branding inicial
- Billing / Stripe Customer Portal (la app abrirá el portal en WebView si hace falta)
- Edición compleja de templates de email (markdown/HTML)

## Reglas y convenciones

- **TypeScript estricto** — sin `any` libre, sin `// @ts-ignore` sin razón.
- **Snake/camelCase** — la API usa snake_case excepto `Public/MenuResource`
  (camelCase). Tipos espejados de `apps/web/src/lib/types.ts`.
- **Multi-tenant** — el backend ya filtra por `local_id` del token, la app
  nunca manda `local_id` explícito. Para switch de sucursal: `POST /me/switch-local/{id}`
  emite un **token nuevo** que reemplaza al anterior.
- **Token** — bearer Sanctum guardado en `expo-secure-store` (Keychain iOS,
  EncryptedSharedPreferences Android).
- **No nuevos endpoints en backend** salvo `mobile/register-device`.
- **Idempotency** — POST `/pedidos` (POS) debe mandar `Idempotency-Key`
  (ver `docs/features/idempotency.md`).
- **Feature gating** — la app NO bypassa `feature:*` middleware; cuando recibe
  402 `FEATURE_LOCKED` muestra un sheet con CTA a billing portal.
- **Imágenes** — uploads van por `POST /uploads/image` (multipart).
  Render desde `https://clicktoeat-api.lumiaaisolutions.com/storage/uploads/…`.
- **Sonido** — `expo-av` con `playsInSilentModeIOS: true` para que suene
  con el switch de silencio activo (modo cocina).
- **Realtime** — v1 polling cada 10s. v1.1 conectar a Reverb/WebSocket
  (canal `local.{id}.pedidos`).

## Build & distribución

- **Dev**: `npx expo start` → abrir con Expo Go en el teléfono (sólo módulos JS,
  no nativos custom). Para push real hace falta dev build.
- **Dev build**: `npx eas build --profile development --platform ios|android`
  (requiere cuenta EAS gratuita).
- **TestFlight** (iOS): `eas build --profile preview --platform ios && eas submit -p ios`.
- **Internal testing** (Android): `eas build --profile preview --platform android && eas submit -p android`.
- **Producción**: `eas build --profile production --platform all && eas submit --platform all`.

Costos:
- Apple Developer: **$99/año** (obligatorio).
- Google Play: **$25 one-time**.
- EAS Build: **gratis hasta 30 builds/mes**.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| App Store rechaza por falta de privacy policy | Reusar `apps/web/src/app/privacidad/`. |
| Push no llega cuando app en background | Verificar entitlements APNs + canales Android. |
| Imágenes Cloudinary muy pesadas en 3G | `expo-image` con transformaciones `w_400` / `q_auto`. |
| Token expira durante uso largo (kiosco cocina) | Auto-refresh con `me` cada 5min; al 401 → re-login modal. |
| Diferencias de UI iOS/Android | Componente custom de DesignSystem que abstrae. |
| Updates over-the-air sin pasar por store | EAS Update (`expo-updates`) — JS bundle se actualiza sin re-submit. |

## Estado actual (2026-06-19)

### Hecho
- [x] Plan documentado (este archivo)
- [x] Bootstrap Expo SDK 56 + Expo Router en `apps/mobile/`
- [x] NativeWind v4 + Tailwind config + global.css
- [x] Capa Core: `api.ts` (axios + bearer + 401/402 interceptor + bus de eventos),
      `secure-store.ts` (token en Keychain/EncryptedSharedPreferences),
      `push.ts` (registro Expo push + canal Android + `registerAndSyncDevice` +
      `unregisterDeviceFromBackend`),
      `audio.ts` (campana con `playsInSilentMode: true`)
- [x] Design System: tokens (`#FAFAF7` / `#FF2D2D` / `#0B0B0F`),
      componentes `Button`, `Input`, `Card`, `EstadoBadge`
- [x] Store de auth con bootstrap + login (incluye 2FA) + logout + `refreshMe`,
      registra/desregistra push automáticamente
- [x] Hook `useAuthEvents` — al 401 hace logout automático y `Stack.Protected`
      redirige a /login
- [x] Tipos espejados de `apps/web/src/lib/types.ts`
- [x] Router root con `Stack.Protected guard={isAuthed}` (patrón SDK 56)
- [x] Pantalla **Login** con 2FA condicional
- [x] Tabs admin: **Inicio** (dashboard), **Pedidos**, **Métricas**, **Ajustes**
- [x] **Pedidos en vivo** con polling 10s + keep-awake + sonido al llegar nuevo + haptics
- [x] **Detalle de pedido** con flujo de estados (confirmar → preparando → listo → en_camino → entregado) + cancelar
- [x] **Métricas** (30 días, top productos, ticket promedio)
- [x] **Ajustes** con logout + botón **Cambiar de sucursal**
- [x] **Switch-local** screen: `GET /me/locales` + `POST /me/switch-local/{id}`,
      invalida toda la caché TanStack + refetch `me`
- [x] EAS config (`eas.json` con perfiles development / preview / production)
- [x] OTA Updates activado (`expo-updates` + `runtimeVersion: appVersion` +
      checkAutomatically ON_LOAD)
- [x] Scripts npm: `build:dev:ios`, `build:dev:android`, `build:preview`,
      `build:prod`, `ota:preview`, `ota:prod`
- [x] Backend: migration `mobile_devices`, modelo `MobileDevice`,
      `RegisterMobileDeviceRequest`, `MobileDeviceController` (register/unregister
      con SEV-11: 409 al cross-user en lugar de reasignación silenciosa),
      rutas en `routes/api.php` bajo `auth:sanctum + tenant`
- [x] Backend: `ExpoPushSender` (HTTP a `exp.host/--/api/v2/push/send`, manejo de
      `DeviceNotRegistered`) + `PushDispatcher` (fan-out web + mobile)
- [x] Backend: `OrderService::crear` ahora usa `PushDispatcher` →
      pedido nuevo dispara push web Y móvil simultáneamente, con
      `data: { pedido_id, codigo, route: '/(admin)/pedidos/{id}' }` para
      deep-link al detalle desde la notif
- [x] Backend: test multi-tenant `MobileDeviceRegistrationTest`
      (registro, re-registro, 409 cross-user, isolation de unregister,
      auth requerida, platform validada)
- [x] TypeScript estricto: `npm run typecheck` pasa limpio

### Pendiente — solo TU acción (no requiere código)
- [ ] `cd apps/mobile && npx eas init` — genera `projectId` en `app.json` →
      sin esto el push no funciona en build de prod
- [ ] **Apple Developer** ($99/año) cuando vayas a TestFlight
- [ ] **Google Play** ($25 one-time) cuando vayas a internal testing
- [ ] Asset `assets/sounds/bell.mp3` (~0.5s, mono) — sin esto la campana es no-op
- [ ] Assets de marca: app icon, splash, fuentes Bricolage Grotesque
- [ ] Privacy policy URL para App Store Connect (reusar `clicktoeat.lumiaaisolutions.com/privacidad`)

### Construido — v1.0 + v1.1 + v1.2 + v1.3 + super admin parcial (2026-06-20)
- [x] **Deep-link desde notif** — `usePushDeepLink` lee `data.route` y navega
- [x] **Notificaciones in-app** (`GET /notificaciones`, marcar leídas)
- [x] **Productos quick-toggle** — lista + switch disponibilidad + edit precio/descuento/promo
- [x] **Categorías** — lista + crear + toggle activo
- [x] **Horarios** — editor por día con cerrado_temporal
- [x] **Buscador global** (`/search`) en su propio tab
- [x] **Inventario** — lista con badge bajo stock + detalle + ajuste (entrada/ajuste/merma) + movimientos
- [x] **Compras a proveedor** — lista (lectura)
- [x] **Cupones** — lista + toggle activo
- [x] **Reviews** — moderación (toggle aprobado + borrar)
- [x] **Staff** — lista con rol y permisos
- [x] **Branding** — nombre, tagline, WhatsApp, teléfono, dirección, color primario, lealtad
- [x] **Tickets de soporte** — lista + crear (asunto, mensaje, categoría, prioridad)
- [x] **Audit log** — feature-gated 402 con CTA al panel web
- [x] **Super admin** (gated por `rol === 'super_admin'`) — locales (suspender/reactivar) +
      SaaS metrics (MRR, ARR, churn, conv, distribución) + anuncios globales
- [x] Tabs limpios (Inicio · Pedidos · Buscar · Más) + menú "Más" con 14 secciones agrupadas
- [x] TypeScript estricto: `npm run typecheck` pasa limpio (66 archivos)

### Pendiente — código que requiere asset o decisión adicional
- [ ] **Productos: crear desde cero + editor de extras/toppings** — UI compleja, mejor en panel web por ahora
- [ ] **Productos: upload de imagen** — requiere `expo-image-picker` + `POST /uploads/image` (multipart)
- [ ] **POS** — crear pedido en sucursal con `Idempotency-Key` + selección de productos
- [ ] **Recetas** — asociar ingredientes a productos (UI de árbol)
- [ ] **Detalle de Compra** (drill-down con líneas)
- [ ] **Detalle de Ticket** (conversación + reply)
- [ ] **Detalle de Local super admin** (editar billing manual, pago_externo)
- [ ] **Multi-sucursal del super admin** (asignar locales a usuarios)
- [ ] **Newsletter, email templates, cupones globales** — UI de markdown/HTML, mejor en panel web
- [ ] **Webhooks outgoing** (Premium) — UI niche, mejor en panel web
- [ ] **Programa de referidos**
- [ ] **Centro de aprendizaje** (animaciones del web no aplican igual en mobile)
- [ ] **Migrar polling 10s → Reverb WebSocket** en v1.1
- [ ] Espejar cambios futuros del `WhatsAppLinkBuilder` (PHP) en `src/lib/whatsapp.ts`

### Pendiente — infra
- [ ] Migrar polling 10s → **Reverb WebSocket** (canal `local.{id}.pedidos`) en v1.1
- [ ] Espejar cambios futuros del `WhatsAppLinkBuilder` (PHP) en `src/lib/whatsapp.ts`
- [ ] Submit a App Store + Google Play
- [ ] Configurar `EXPO_PUBLIC_API_URL` por perfil en `eas.json` con tu IP LAN
      para builds dev (placeholder en `192.168.1.10`)
