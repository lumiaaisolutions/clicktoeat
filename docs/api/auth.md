# API — Autenticación

Bearer tokens Sanctum. Prefijo `/auth/*`.

## POST `/auth/register`

Crea un usuario `owner` (sin local asignado todavía). Sólo para crear cuentas que después un super_admin vinculará a un local. **Throttle `5/min`**.

### Request
```json
{
  "nombre": "María Pérez",
  "email": "maria@example.com",
  "password": "secret123",
  "password_confirmation": "secret123"
}
```

Validación: `RegisterRequest` — email único, password mínimo 8 chars con letras y números.

### 201
```json
{
  "user":  { "id": 5, "nombre":"María Pérez", "email":"...", "rol":"owner", "local_id": null },
  "token": "11|abcd..."
}
```

---

## POST `/auth/login`

**Throttle `10/min` + guard manual de 5 intentos por IP+email** (429 con segundos hasta el siguiente intento).

### Request
```json
{
  "email": "owner+tacos-el-gordo@ClickToEat.app",
  "password": "password123",
  "device": "web"        // opcional, etiqueta del token
}
```

### 200
```json
{
  "user":  { "id": 2, "nombre":"...", "email":"...", "rol":"owner", "local_id": 1 },
  "token": "12|wxyz..."
}
```

### 422 credenciales malas / 429 rate limit

```json
{ "message": "...", "errors": { "email": ["Credenciales incorrectas."] } }
```

### Abilities por rol

Asignadas al token según `AuthController::abilitiesFor()`:

| Rol           | Abilities                                                     |
|---------------|---------------------------------------------------------------|
| `super_admin` | `["*"]`                                                       |
| `owner`       | `["local:*","productos:*","pedidos:*","inventario:*"]`         |
| `staff`       | `["pedidos:read","pedidos:update"]`                            |

> Hoy la autorización efectiva se decide por **Policies**, no por abilities. Las abilities quedan para cuando se quiera exponer API keys de scope reducido.

---

## GET `/auth/me`

Devuelve el user autenticado + su local cargado.

**Auth:** `auth:sanctum`.

### 200
```json
{
  "user": {
    "id": 2, "nombre":"...", "email":"...", "rol":"owner", "local_id": 1,
    "local": { /* objeto Local */ }
  }
}
```

---

## POST `/auth/logout`

Borra **sólo el token actual** de `personal_access_tokens`. Los demás dispositivos siguen logueados.

**Auth:** `auth:sanctum`.

### 204 No Content

---

## PATCH `/auth/me/password`

Cambio de contraseña del usuario actual. Requiere la contraseña actual. **Throttle `5/min`**.

**Auth:** `auth:sanctum`.

### Request
```json
{
  "current_password": "password123",
  "password": "nueva-segura-456",
  "password_confirmation": "nueva-segura-456"
}
```

### 200
```json
{ "message": "Contraseña actualizada." }
```

### 422
- Contraseña actual incorrecta → `errors.current_password`.
- Nueva contraseña <8 chars → `errors.password`.

### Comportamiento adicional

Al éxito se invalidan **todos los tokens del usuario excepto el actual** (`PasswordController::updateOwn`). Es decir: si tienes sesiones abiertas en otros dispositivos, se cierran. El dispositivo en curso sigue funcionando.

---

## Reset por super_admin (no por email)

Endpoint para que super_admin resetee el password del owner de un local específico. Ver [`api/admin.md`](admin.md) → `PATCH /admin/locales/{id}/owner-password`.

---

## Lo que NO existe

- ❌ `POST /auth/forgot-password` (reset por email)
- ❌ `POST /auth/reset-password`
- ❌ `POST /auth/email/verify`

Tabla `password_reset_tokens` existe pero los endpoints no están implementados. Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md).
