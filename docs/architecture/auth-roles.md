# Arquitectura — Auth y roles

## Mecanismo

**Laravel Sanctum, modo "personal access tokens"** (bearer). NO se usa el modo SPA-stateful porque Next.js corre en otro origen (`localhost:3000`) y eso forzaría cookies + CSRF.

- Login con `POST /api/v1/auth/login` → devuelve `{ user, token }`.
- El cliente guarda el token (frontend lo persiste en `localStorage` bajo `clickeat:token`).
- Cada request lleva `Authorization: Bearer <token>`.
- Logout (`POST /api/v1/auth/logout`) borra el token actual de `personal_access_tokens`.

Fuente: `AuthController`, `LoginRequest`, `RegisterRequest`, frontend `apps/web/src/store/auth.ts` + `apps/web/src/lib/api.ts`.

## Roles

Enum en `users.rol`:

| Rol           | `local_id` | Puede                                                |
|---------------|-----------|------------------------------------------------------|
| `super_admin` | NULL      | Todo. Bypassea tenant. Crea/suspende locales. Resetea passwords. |
| `owner`       | obligatorio | CRUD completo en su local: branding, productos, recetas, ingredientes, compras, pedidos. |
| `staff`       | obligatorio | Ver/actualizar pedidos, ajustar inventario (sin borrar productos ni cambiar branding). |

El registro público (`POST /auth/register`) crea **siempre** un `owner` sin local asignado todavía. El `super_admin` se crea **sólo por seeder** (`UsuariosSeeder`).

## Sanctum abilities

`AuthController::abilitiesFor()` asigna abilities al token según el rol:

```php
'super_admin' => ['*'],
'owner'       => ['local:*', 'productos:*', 'pedidos:*', 'inventario:*'],
'staff'       => ['pedidos:read', 'pedidos:update'],
```

> **Heads up:** las abilities están en el token pero **los endpoints actuales no las verifican explícitamente** (no hay `tokenCan(...)` ni `ability:` middleware). Hoy la autorización efectiva la hacen las **Policies**. Las abilities están listas para cuando se quiera permitir API keys con scope reducido (ej. integraciones de terceros).

## Policies

`AuthServiceProvider` registra:

| Modelo         | Policy                       |
|---------------|------------------------------|
| `Local`        | `LocalPolicy`                |
| `Categoria`    | `CategoriaPolicy`            |
| `Compra`       | `CompraPolicy`               |
| `Producto`     | `ProductoPolicy`             |
| `Pedido`       | `PedidoPolicy`               |
| `Ingrediente`  | `IngredientePolicy`          |
| `Receta`       | `RecetaPolicy`               |
| `Notificacion` | `NotificacionPolicy`         |

Todas tienen un `before()` que devuelve `true` para super_admin → siempre puede.

Ver [`api/policies.md`](../api/policies.md) para la matriz completa de quién puede qué.

## Middlewares de auth

- **`auth:sanctum`** — exige Bearer token válido.
- **`tenant`** (alias de `EnforceTenantScope`) — setea TenantContext desde `auth()->user()->local_id`. Bloquea (403) si el user no es super_admin y no tiene local.
- **`super_admin`** (alias de `EnsureSuperAdmin`) — bloquea (403) si el user no es super_admin.

Composición típica:

```php
// rutas tenant-scoped del owner/staff
Route::middleware(['auth:sanctum', 'tenant'])->group(fn () => ...);

// rutas globales del super_admin
Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(fn () => ...);
```

## Rate limiting de auth

- `POST /auth/register` → `throttle:5,1` (5 intentos/min por IP).
- `POST /auth/login` → `throttle:10,1` por IP **más** un guard manual en el controller: 5 intentos por `IP+email` → 429 con `Retry-After`.
- `PATCH /auth/me/password` → `throttle:5,1`.
- `PATCH /admin/locales/{id}/owner-password` → `throttle:10,1`.

## Cambio de contraseña

- **Propio** (`PATCH /auth/me/password`): requiere `current_password`. Al éxito, invalida todos los demás tokens (mantiene el actual). Ver `PasswordController::updateOwn`.
- **Reset por super_admin** (`PATCH /admin/locales/{id}/owner-password`): no requiere password actual del owner. Al éxito, borra todos los tokens del owner — debe re-loguearse. Ver `PasswordController::resetLocalOwner`.

## Lo que NO existe (todavía)

- ❌ Reset de contraseña por email (tabla `password_reset_tokens` existe, sin endpoints).
- ❌ Verificación de email (campo `email_verified_at` se llena al seedear y al alta admin; nunca se valida).
- ❌ MFA / 2FA.
- ❌ OAuth / login social.
- ❌ Rotación o expiración programada de tokens (`expires_at` queda null).

Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md).
