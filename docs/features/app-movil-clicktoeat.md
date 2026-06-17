# App móvil ClickToEat — plan de implementación

App nativa (iOS + Android) que reemplaza el "tablet en cocina" abriendo
el panel con sonido y notificaciones push al llegar cada pedido.

## Stack recomendado

**React Native + Expo** (sin Swift/Kotlin nativo).

Razones:
- Reutilizamos componentes y lógica del Next.js web (axios, zustand, lógica de cart).
- Un solo codebase para iOS + Android.
- Expo se encarga de notificaciones push (APNs + FCM), permisos, builds firmados.
- Subimos a App Store + Google Play sin tocar Xcode/Android Studio.

## Arquitectura

```
ClickToEat App (React Native)
   │
   ├── Login (mismo Sanctum bearer token)
   ├── Cola de pedidos (polling cada 10s + push)
   ├── Detalle de pedido (aceptar / preparar / listo / entregar)
   ├── Sonido al llegar pedido nuevo (configurable)
   └── Settings (notif, sonido, brillo siempre on)
   │
   └─── API: https://clicktoeat-api.lumiaaisolutions.com (existente)
        └─── Endpoints reusados:
             POST /auth/login              → token sanctum
             GET  /pedidos?estado=nuevo    → cola
             PATCH /pedidos/{id}           → cambio estado
             POST /push/subscribe          → registro token Expo
```

**Sin nuevos endpoints en el backend.** La app consume la API REST
existente.

## Tareas en el backend (mínimas)

1. Agregar columna `expo_push_token` a `push_subscriptions` (o tabla
   nueva si prefieren separar web push de mobile push).
2. Crear `POST /api/v1/mobile/register-device` para guardar el token.
3. Adaptar `WebPushSender` para que también mande a Expo Push API
   (`https://exp.host/--/api/v2/push/send`).

## Tareas en la app (estimado: 3-5 días)

1. `npx create-expo-app clicktoeat-app --template`
2. Setup de auth con `@react-native-async-storage/async-storage`
3. Screen `Login` → POST /auth/login → guardar token
4. Screen `Pedidos` con `react-query` polling cada 10s
5. `expo-notifications` para push (config con VAPID/FCM)
6. `expo-av` para sonido al llegar pedido nuevo
7. `expo-keep-awake` para que el screen NO se apague en cocina
8. Build con `eas build --platform all`
9. Submit a App Store + Google Play

## Prompt para generar la app

Lo que un dev junior (o IA) puede usar para arrancar:

```
Crea una app React Native con Expo SDK 51 que se conecte al backend
Laravel de ClickToEat en https://clicktoeat-api.lumiaaisolutions.com/api/v1.

Funcionalidad:
1. Pantalla de Login que postea email+password a /auth/login y guarda el
   token (Sanctum bearer) en AsyncStorage.
2. Pantalla principal "Pedidos en vivo":
   - Polling cada 10 segundos a GET /pedidos?estado=nuevo
   - Lista de cards con código del pedido, cliente, total, productos
   - Cada card abre detalle al tap
   - Cuando llega un pedido nuevo, reproducir sonido bell.mp3 +
     vibración + push notification local
3. Pantalla de detalle de pedido:
   - Botones: Confirmar / Preparando / Listo / Entregado / Cancelar
   - Cada botón hace PATCH /pedidos/{id} con {estado: 'xxx'}
4. Settings: toggle "Sonido al llegar pedido", toggle "Mantener pantalla
   encendida" (expo-keep-awake), botón cerrar sesión.

Usa zustand para estado global. NativeWind para estilos (Tailwind en RN).
Diseño dark mode con bg #211A13 y acentos #FF2D2D. Tipografía
Bricolage Grotesque para títulos.
```

## Costo y timing

- **Apple Developer account**: $99/año (obligatorio para App Store)
- **Google Play account**: $25 one-time
- **EAS Build**: gratis hasta 30 builds/mes (gratis para empezar)
- **Tiempo**: 3-5 días de un dev React Native + 1 día por aprobación de Apple

## Roadmap sugerido

**v1.0** (MVP, lo del prompt arriba): 5 días
**v1.1** (offline mode con SQLite local): +3 días
**v1.2** (impresión a impresora Bluetooth de tickets): +2 días
**v2.0** (KDS multi-pantalla — una pantalla por estación de cocina): +2 semanas

## Por qué NO se implementa AHORA

- El web PWA actual ya cubre el caso "tablet en cocina" para owners que
  acepten poner Chrome o Safari abierto.
- Subir a App Store/Play Store implica mantenimiento continuo (updates de
  iOS/Android rompen builds).
- Conviene esperar a tener 50+ locales pagando — ahí la economía
  justifica el esfuerzo.
