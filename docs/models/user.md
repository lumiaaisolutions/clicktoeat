# Modelo — `User`

Fuente: `apps/api/app/Models/User.php`. Tabla: `users`.

## Rol

Tres roles:
- `super_admin` — global, sin `local_id`.
- `owner` — dueño de un local (`local_id` obligatorio en runtime).
- `staff` — personal de un local.

## Extends

`Illuminate\Foundation\Auth\User as Authenticatable`. Implementa `HasApiTokens` (Sanctum), `Notifiable`, `SoftDeletes`.

## Fillable

```
nombre, email, password, rol, local_id
```

## Hidden

`password`, `remember_token` — nunca salen al JSON.

## Casts

| Campo                | Cast      |
|---------------------|-----------|
| `email_verified_at`  | datetime   |
| `password`           | hashed    | ← auto-hash al asignar

## Relaciones

| Método  | Tipo            | Notas                                  |
|--------|-----------------|----------------------------------------|
| `local()`| BelongsTo Local | Por `local_id` (NULL para super_admin) |

## Helpers

- `isSuperAdmin(): bool` → `rol === 'super_admin'`.
- `isOwner(): bool` → `rol === 'owner'`.

> No hay `isStaff()` — usa `rol === 'staff'` literal.

## Quién crea quién

- **Super admin**: sólo desde `UsuariosSeeder`. No hay endpoint para crearlo.
- **Owner**: `POST /auth/register` lo crea sin `local_id` (luego super_admin lo vincula al alta del local) **o** `POST /admin/locales` lo crea con el local en un solo paso.
- **Staff**: hoy **no hay endpoint** para crearlo. Sólo manualmente vía Tinker o seeder. **Pendiente** (ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md)).

## Tokens

Sanctum guarda tokens en `personal_access_tokens` con abilities por rol (ver [`architecture/auth-roles.md`](../architecture/auth-roles.md)).

- `currentAccessToken()` — el del request actual.
- `tokens()->delete()` — invalidar todos.
