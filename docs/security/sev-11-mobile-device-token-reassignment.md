# SEV-11 — Reasignación silenciosa del token de push móvil

> **Severidad**: media · **Estado**: resuelto · **Fecha**: 2026-06-20

## Resumen

La primera versión del endpoint `POST /api/v1/mobile/register-device`
hacía `updateOrCreate(['expo_push_token' => $token], ['user_id' => $user->id, ...])`,
lo que reasignaba silenciosamente el registro del dispositivo a quien
fuera el último user en mandar el token.

Esto permitía a un atacante que obtuviera el `expo_push_token` de otro
user (los tokens Expo **no son secretos** — viajan en logs del SDK, en
crash reports, en analytics, etc.) **silenciar las notificaciones del
owner real**:

1. Atacante obtiene `ExponentPushToken[abc...]` del owner (de un log filtrado, una crash report, etc.)
2. Atacante hace login con su cuenta y llama `POST /mobile/register-device` con ese token
3. Backend reasigna el token al atacante
4. El owner deja de recibir push notifications de sus pedidos
5. El atacante recibe las notifications del owner (incluyen `pedido_id`, `codigo`, `cliente_nombre`)

## Impacto

- **Disponibilidad**: el owner real deja de recibir alertas de pedidos nuevos hasta que vuelva a hacer login (lo que re-registra su token).
- **Confidencialidad**: el atacante puede leer metadatos del pedido en la notif (cliente, código, total).
- **Integridad**: no aplica — el atacante no puede modificar pedidos solo por tener el token.

No se observó explotación. La ventana fue corta (la vulnerabilidad
existió solo durante el desarrollo inicial, antes de subir a TestFlight).

## Fix

Cambiamos el `updateOrCreate` para usar la pareja **`(expo_push_token, user_id)`** como clave compuesta y agregamos un check explícito de cross-user.

```php
$existing = MobileDevice::query()
    ->where('expo_push_token', $data['expo_push_token'])
    ->first();

if ($existing && $existing->user_id !== $user->id) {
    return response()->json([
        'message' => 'Este dispositivo ya está registrado para otra cuenta...',
        'code'    => 'device_already_registered',
    ], 409);
}

MobileDevice::updateOrCreate(
    ['expo_push_token' => $data['expo_push_token'], 'user_id' => $user->id],
    [/* atributos no-llave */],
);
```

Archivo: `apps/api/app/Http/Controllers/Api/MobileDeviceController.php`.

### Flujo legítimo (cocina compartida)

Una cocina con varios owners alternando login en el mismo tablet **debe**
llamar `POST /mobile/unregister-device` al cerrar sesión. El cliente
móvil lo hace automáticamente en `useAuth.logout()` (ver
`apps/mobile/src/store/auth.ts`).

Si el primer owner se desconecta sin llamar unregister (proceso killed,
sin red, etc.), el segundo recibe **409** y se le muestra el mensaje
"cierra sesión en el otro dispositivo primero". La app móvil **ignora
silenciosamente el 409** y sigue funcionando — solo no recibe push hasta
que el primer owner haga `unregister-device` desde su sesión.

## Tests

`apps/api/tests/Feature/MobileDeviceRegistrationTest.php`:
- `token_ya_registrado_para_otro_user_responde_409` — verifica el 409
- `reregistro_del_mismo_token_actualiza_no_duplica` — verifica idempotencia del mismo user
- `unregister_solo_borra_si_es_del_user` — verifica isolation cross-user en unregister

## Referencias

- Endpoint: [`../api/mobile.md`](../api/mobile.md)
- Tabla: [`../database/schema.md#mobile_devices`](../database/schema.md#mobile_devices)
- Patrón de push: [`../architecture/push-dispatcher.md`](../architecture/push-dispatcher.md)
- Threat model general: [`./threat-model.md`](./threat-model.md)
