# App móvil ClickToEat — plan de implementación

> Estado: en desarrollo activo (2026-06-19).
> Bootstrap inicial bajo `apps/mobile/`. Objetivo: paridad funcional con
> el panel web (`apps/web/`) en iOS + Android desde un único codebase.

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
- [x] Capa Core: `api.ts` (axios + bearer + 401/402 interceptor),
      `secure-store.ts` (token en Keychain/EncryptedSharedPreferences),
      `push.ts` (registro Expo push + canal Android),
      `audio.ts` (campana con `playsInSilentMode: true`)
- [x] Design System: tokens (`#FAFAF7` / `#FF2D2D` / `#0B0B0F`),
      componentes `Button`, `Input`, `Card`, `EstadoBadge`
- [x] Store de auth con bootstrap + login (incluye 2FA) + logout
- [x] Tipos espejados de `apps/web/src/lib/types.ts`
- [x] Router root con `Stack.Protected guard={isAuthed}` (patrón SDK 56)
- [x] Pantalla **Login** con 2FA condicional
- [x] Tabs admin: **Inicio** (dashboard), **Pedidos**, **Métricas**, **Ajustes**
- [x] **Pedidos en vivo** con polling 10s + keep-awake + sonido al llegar nuevo + haptics
- [x] **Detalle de pedido** con flujo de estados (confirmar → preparando → listo → en_camino → entregado) + cancelar
- [x] **Métricas** (30 días, top productos, ticket promedio)
- [x] **Ajustes** con logout
- [x] Backend: migration `mobile_devices`, modelo `MobileDevice`,
      `RegisterMobileDeviceRequest`, `MobileDeviceController` (register/unregister),
      rutas en `routes/api.php` bajo `auth:sanctum + tenant`
- [x] Backend: `ExpoPushSender` (HTTP a `exp.host/--/api/v2/push/send`, manejo de
      `DeviceNotRegistered`) + `PushDispatcher` (fan-out web + mobile)
- [x] Backend: test multi-tenant `MobileDeviceRegistrationTest`
      (registro, re-registro, reasignación user, isolation de unregister,
      auth requerida, platform validada)
- [x] TypeScript estricto: `npm run typecheck` pasa limpio

### Pendiente para llegar a paridad completa
- [ ] Configurar EAS (`eas.json`, `projectId`) y registrar `expoConfig.extra.eas.projectId`
- [ ] Asset `assets/sounds/bell.mp3` (ahora hay placeholder no-op)
- [ ] Asset `assets/fonts/BricolageGrotesque-*.ttf` + `expo-font` loader
- [ ] App icon + splash screen con identidad ClickToEat
- [ ] Primera **dev build** (`eas build --profile development`) y prueba en device físico
- [ ] Hook `useAuthEvents` que escuche `apiEvents` y haga logout al 401
- [ ] Pantalla **Productos** (lista + toggle disponibilidad + editar precio + upload imagen)
- [ ] Pantalla **Categorías** (lista + reorder)
- [ ] Pantalla **Notificaciones** in-app (`/notificaciones`)
- [ ] Pantalla **Multi-sucursal switcher** (`/me/locales` + `/me/switch-local/{id}`)
- [ ] Cambiar el `WhatsAppLinkBuilder` en el web también debe espejarse en `src/lib/whatsapp.ts`
- [ ] Migrar polling → Reverb WebSocket en v1.1
- [ ] Llamar al `PushDispatcher` desde `OrderService::crear` (ya hay
      WhatsAppLinkBuilder + WebPushSender; falta cambiar a `app(PushDispatcher::class)`)
- [ ] Submit a App Store + Google Play (cuentas pagadas)
- [ ] Subir privacy policy en App Store Connect (reusar `apps/web/.../privacidad`)
