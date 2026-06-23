# API móvil — registro de dispositivos

> Endpoints dedicados a la app nativa (iOS/Android, Expo SDK 56).
> Permiten registrar el `expo_push_token` del dispositivo para que el
> backend pueda mandarle push notifications via Expo Push Service.
> Introducidos en 2026-06-19.

## Resumen

| Método | Ruta | Auth | Throttle |
|---|---|---|---|
| `POST` | `/api/v1/mobile/register-device` | `sanctum + tenant` | 20/min |
| `POST` | `/api/v1/mobile/unregister-device` | `sanctum + tenant` | 20/min |

Ambos viven dentro del grupo `auth:sanctum + tenant` en `routes/api.php`.

## `POST /mobile/register-device`

Registra (o actualiza) el token de Expo Push de un dispositivo.

### Request

```json
{
  "expo_push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "device_name": "iPhone Cocina",
  "app_version": "1.0.0"
}
```

| Campo | Tipo | Required | Reglas |
|---|---|---|---|
| `expo_push_token` | string | sí | max 200 chars |
| `platform` | string | sí | `ios` o `android` |
| `device_name` | string | no | max 120 chars |
| `app_version` | string | no | max 32 chars |

Validación en `App\Http\Requests\RegisterMobileDeviceRequest`.

### Responses

**201 Created** — Registro nuevo o actualización exitosa:
```json
{
  "data": { "id": 42, "platform": "ios" }
}
```

**409 Conflict** — El token ya está asociado a otro user (SEV-11):
```json
{
  "message": "Este dispositivo ya está registrado para otra cuenta. Cierra sesión en el otro dispositivo primero.",
  "code": "device_already_registered"
}
```

> El cliente móvil ignora silenciosamente el 409 (sigue funcionando sin
> push) — ver `apps/mobile/src/core/push.ts::syncDeviceWithBackend`.
> Detalle de la decisión: [`../security/sev-11-mobile-device-token-reassignment.md`](../security/sev-11-mobile-device-token-reassignment.md).

**422 Unprocessable Entity** — Validación falló:
```json
{
  "message": "The given data was invalid.",
  "errors": { "platform": ["The selected platform is invalid."] }
}
```

**401 Unauthenticated** — Sin bearer token.

### Comportamiento

- Si `(expo_push_token, user_id)` ya existe → actualiza `platform`, `device_name`, `app_version`, `last_seen_at`, `local_id`.
- Si el `expo_push_token` existe pero pertenece a otro `user_id` → **409** (no reasigna).
- El `local_id` se toma de `user->local_id` (puede ser null para super_admin).

## `POST /mobile/unregister-device`

Borra el registro del dispositivo cuando el user cierra sesión o la app
es desinstalada. Solo borra filas que pertenezcan al user autenticado.

### Request

```json
{ "expo_push_token": "ExponentPushToken[xxxxxxxxxx]" }
```

### Response

**200 OK**:
```json
{ "data": null }
```

Si el token no existe o pertenece a otro user, igual responde 200 (idempotente).

## Tabla relacionada

Ver [`../database/schema.md#mobile_devices`](../database/schema.md#mobile_devices).

## Servicio backend

El envío de push se hace via `App\Services\Notifications\ExpoPushSender`
o el wrapper unificado `App\Services\Notifications\PushDispatcher` que
hace fan-out a web push + móvil. Ver
[`../architecture/push-dispatcher.md`](../architecture/push-dispatcher.md).

## Tests

`apps/api/tests/Feature/MobileDeviceRegistrationTest.php` cubre:
- Registro inicial
- Re-registro idempotente (mismo user)
- 409 cross-user (SEV-11)
- Unregister solo borra si es del user
- Auth requerida
- Validación de platform

## Documentación relacionada

- App móvil completa: [`../features/app-movil-clicktoeat.md`](../features/app-movil-clicktoeat.md)
- Patrón PushDispatcher: [`../architecture/push-dispatcher.md`](../architecture/push-dispatcher.md)
- SEV-11 hardening: [`../security/sev-11-mobile-device-token-reassignment.md`](../security/sev-11-mobile-device-token-reassignment.md)
