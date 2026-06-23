# Arrancar y desplegar la app móvil ClickToEat

> Runbook operativo para correr `apps/mobile/` en dev, generar dev builds
> y publicar en TestFlight / Play Internal.
> La app es Expo SDK 56 + Expo Router con TypeScript estricto.

## Prerequisitos

- **Node.js** 20+ (la app está testeada con 23.6.1).
- **Mac con Xcode** si quieres simulador iOS.
- **Android Studio + emulator AVD** si quieres simulador Android.
- **Expo Go app** en tu teléfono si vas a probar sin dev build (limitado).
- **Cuenta EAS** (gratis) — necesaria para builds y push en prod.

## Arrancar en dev

### Simulador iOS (más rápido para iterar UI)
```bash
cd apps/mobile
npm install                # solo la primera vez
npm run ios
```
Abre el simulador automáticamente y conecta el bundler.

### Emulador Android
```bash
cd apps/mobile
npm run android
```

### Device físico — Expo Go (limitado)
```bash
cd apps/mobile
npm run start
```
Escanea el QR con la app Expo Go. **Limitaciones**:
- iOS: push notifications **no funcionan** (Expo Go no tiene APNs).
- Android: push notifications **no funcionan desde SDK 53** (requiere dev build).
- Sonido (`expo-audio`) sí funciona.

## Configurar EAS (una sola vez)

Necesario para builds firmados y para que push funcione en prod.

```bash
cd apps/mobile
npx eas login                 # crea cuenta en expo.dev si no tienes
npx eas init                  # escribe projectId en app.json automáticamente
```

Después de `eas init`, verifica que `app.json` tenga:
```json
"extra": {
  "apiUrl": "https://clicktoeat-api.lumiaaisolutions.com/api/v1",
  "eas": { "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
}
```

## Dev build (push real + módulos nativos)

```bash
# iOS — requiere cuenta Apple Developer ($99/año)
npm run build:dev:ios

# Android — no requiere cuenta Play
npm run build:dev:android
```

EAS construye en la nube y te devuelve un link/QR para instalar. Una vez
instalado en el device:

```bash
npx expo start --dev-client
```

Y abres con el dev build (no con Expo Go).

## Variables de entorno por perfil

`eas.json` define perfiles con `env` vars:
```json
"development": {
  "env": {
    "EXPO_PUBLIC_API_URL": "http://192.168.1.10:8080/api/v1"
  }
}
```

Para probar contra tu API local, reemplaza `192.168.1.10` con tu IP de
LAN (`ipconfig getifaddr en0` en Mac). Si solo usas la API de
producción, déjalo igual — el código lee `Constants.expoConfig.extra.apiUrl`
como fallback.

## Builds para distribución

### TestFlight (iOS interno)
```bash
npm run build:preview
# Cuando termine:
npx eas submit -p ios --latest
```
Requiere:
- Apple Developer Program activo
- App creada en App Store Connect con `bundleIdentifier: com.lumia.clicktoeat`
- `ascAppId` actualizado en `eas.json` (reemplaza `REEMPLAZAR_CON_APP_STORE_CONNECT_ID`)

### Google Play Internal
```bash
npm run build:preview
npx eas submit -p android --latest
```
Requiere:
- Google Play Console activo
- Service account JSON en EAS secrets

### Producción
```bash
npm run build:prod
npx eas submit --platform all --latest
```

## OTA Updates

La app tiene `expo-updates` activado. Para empujar un fix JS sin pasar
por App Store:

```bash
npm run ota:preview   # canal preview
npm run ota:prod      # canal production
```

Funciona porque `runtimeVersion: { policy: "appVersion" }` — versiones del
mismo `1.0.x` reciben el update. Bumping `1.0.0 → 1.1.0` requiere
nueva build.

## Estructura del proyecto

```
apps/mobile/
├── app.json           — config Expo
├── eas.json           — perfiles de build
├── babel.config.js    — nativewind/babel + babel-preset-expo
├── metro.config.js    — withNativeWind
├── tailwind.config.js — tokens del design system
└── src/
    ├── app/                # Expo Router (rutas por archivo)
    │   ├── _layout.tsx     # root con Stack.Protected
    │   ├── (auth)/login.tsx
    │   └── (admin)/        # grupo protegido
    │       ├── _layout.tsx # 4 tabs + 14+ rutas ocultas
    │       ├── index.tsx   # dashboard
    │       ├── pedidos/    # cola en vivo + detalle
    │       ├── productos/
    │       ├── inventario/
    │       ├── tickets/
    │       ├── super/      # gated rol === super_admin
    │       └── ... (categorias, cupones, reviews, staff, branding...)
    ├── core/               # api.ts, secure-store.ts, push.ts, audio.ts
    ├── store/auth.ts       # Zustand
    ├── lib/                # types, format
    ├── design/             # tokens + Button, Input, Card, EstadoBadge
    └── features/           # api.ts por dominio
```

## Troubleshooting

### "Cannot determine the project's Expo SDK version"
- Falta correr `npm install` — el bootstrap se hizo con `--no-install`.

### Push notifications no funcionan
- ¿Hiciste `eas init`? Sin `projectId`, `getExpoPushTokenAsync` falla.
- ¿Estás en Expo Go en Android? No funciona desde SDK 53. Necesitas dev build.
- ¿Permisos otorgados? Settings del teléfono → la app → Notifications.

### Campana no suena
- ¿Está el asset `assets/sounds/bell.mp3`? Si no, `playBell()` es no-op silencioso.
- ¿iOS con silent switch activo? `setAudioModeAsync({ playsInSilentMode: true })` lo permite, pero el modo "no molestar" sí lo bloquea.

### TypeScript no encuentra `expo-audio` types
- Re-correr `npm install` y verificar que `node_modules/expo-audio` existe.

## Referencias

- Plan completo de la app: [`../features/app-movil-clicktoeat.md`](../features/app-movil-clicktoeat.md)
- Endpoints móviles: [`../api/mobile.md`](../api/mobile.md)
- Patrón de push backend: [`../architecture/push-dispatcher.md`](../architecture/push-dispatcher.md)
- SEV-11 hardening: [`../security/sev-11-mobile-device-token-reassignment.md`](../security/sev-11-mobile-device-token-reassignment.md)
