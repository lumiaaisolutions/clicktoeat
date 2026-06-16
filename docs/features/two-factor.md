# 2FA TOTP (verificación en 2 pasos)

Cualquier usuario (super_admin u owner) puede activar 2FA TOTP desde `/admin/perfil` → "Verificación en 2 pasos".

## Flujo de activación

1. **`POST /auth/2fa/setup`** — genera secret aleatorio + URL otpauth.
   - El secret se guarda **cifrado** (`Crypt::encryptString`) en `users.two_factor_secret`.
   - `two_factor_confirmed_at = NULL` hasta que confirme.
   - Devuelve `secret` (base32) y `otpauth_url`.
2. Frontend muestra QR generado con `api.qrserver.com` desde `otpauth_url`.
3. Usuario escanea con Google Authenticator / 1Password / Authy.
4. Usuario escribe el código de 6 dígitos.
5. **`POST /auth/2fa/confirm`** con `{code}` — verifica TOTP, marca `two_factor_confirmed_at = now()` y genera **8 códigos de recuperación**.
6. Los códigos de recuperación se muestran UNA SOLA VEZ — el user debe guardarlos.

## Login con 2FA

`POST /auth/login` con `{email, password}` cuando el user tiene 2FA:

- Si NO incluyes `otp` → devuelve `200` con `{two_factor_required: true}`. Frontend muestra input.
- Si incluyes `otp` y es válido (código TOTP actual O recovery code) → devuelve `{user, token}` normal.
- Si incluyes `otp` y es inválido → `422` con `{errors: {otp: ['Código 2FA incorrecto.']}}`.

Los recovery codes son **one-time use** — al usar uno se borra de la lista.

## Desactivar

`POST /auth/2fa/disable` con `{password}` — requiere la contraseña actual (no el OTP).

## Modelo de datos

Columnas en `users`:

```sql
two_factor_secret           TEXT       NULLABLE  -- cifrado con APP_KEY
two_factor_confirmed_at     TIMESTAMP  NULLABLE  -- NULL = setup en progreso
two_factor_recovery_codes   TEXT       NULLABLE  -- JSON cifrado de 8 codes
```

Los 3 campos son `hidden` en el modelo (no salen en respuestas JSON).

## Recuperación si pierdes el dispositivo

1. Usa uno de tus 8 recovery codes en el campo OTP del login.
2. Una vez adentro, ve a `/admin/perfil` → "Verificación en 2 pasos" → Desactiva con tu contraseña.
3. Vuelve a activar y guarda los nuevos códigos.

Si también perdiste los recovery codes: necesitas que un `super_admin` te resetee desde la BD:

```php
$user = User::find($id);
$user->two_factor_secret = null;
$user->two_factor_confirmed_at = null;
$user->two_factor_recovery_codes = null;
$user->save();
```

## Librería

`pragmarx/google2fa` — el secret se cifra con `Crypt` (que usa `APP_KEY`). Si rotas `APP_KEY` todos los 2FA quedan inutilizables — coordinar.
