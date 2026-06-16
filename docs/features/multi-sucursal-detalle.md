# Multi-sucursal (detalle de implementación)

Un mismo `User` puede tener acceso a múltiples `Local`s y cambiar entre ellos sin cerrar sesión. Diseñado para owners con cadenas pequeñas y para el plan Premium.

## Modelo

`users.local_id` sigue siendo el **local activo** (current_local_id) — sirve para que todo el código existente que filtra por tenant siga funcionando sin cambios.

Pivot `user_locales` (creada en F71):
```sql
CREATE TABLE user_locales (
  id, user_id, local_id, created_at,
  UNIQUE (user_id, local_id)
);
```

Backfill: la migración inserta un row por cada `(users.id, users.local_id)` existente, así nadie pierde acceso.

## Endpoints

| Verbo | Path | Auth | Descripción |
|---|---|---|---|
| GET   | `/me/locales` | sanctum | Lista mis locales (id, nombre, slug, logo_url, color_primario) |
| POST  | `/me/switch-local/{id}` | sanctum | Cambia `users.local_id` al especificado (debe estar en `user_locales`) |
| GET   | `/admin/users/{user}/locales` | super | Lista los locales asignados a un user |
| POST  | `/admin/users/{user}/locales` | super | Body `{local_ids: [int]}` — asigna múltiples |
| DELETE | `/admin/users/{user}/locales/{localId}` | super | Revoca uno |

## UI

### Selector en sidebar (owner)

`<LocalSwitcher>` en `apps/web/src/components/admin/LocalSwitcher.tsx`:
- Llama `GET /me/locales` al login.
- Sólo se renderiza si el user tiene ≥2 locales (sino, no hay nada que cambiar).
- Click → `POST /me/switch-local/{id}` → `window.location.reload()` para refrescar toda la data del tenant.

### Asignación (super_admin)

`/admin/locales/[id]/usuarios` → sección "Sucursales que ve {owner}":
- Multi-checkbox con todos los locales.
- Toggle attach/detach al instante.
- El local "actual" (en cuyo contexto estás) no se puede desasignar si es el único.

## ¿Cómo gana el feature?

- **Plan Essential / Professional**: por default un local por owner. El switcher no aparece. La UI super sigue funcionando (puedes asignar manualmente sin pasar por la app del owner).
- **Plan Premium**: feature `multi_sucursal` desbloquea el flow de alta multi-sucursal vía API (futuro). Por ahora el super_admin asigna manualmente y todos pueden ver el switcher.

> Nota: la columna `Local.owner_id` se mantiene para retrocompatibilidad (es el "owner principal" del local). En multi-sucursal, varios users pueden tener acceso a un mismo local; el `owner_id` sigue marcando quién es el dueño jurídico (recibe emails, factura va a su nombre).

## Edge cases

- Si un user pierde acceso a su `local_id` actual (detach), `detachFromUser` lo bajará al primer local que le quede. Si no le quedan ninguno, `local_id = null` y al loguear no podrá entrar al admin.
- El `canAccessLocal(int $localId): bool` del modelo `User` se usa como guard en `switchLocal`. Super admin siempre retorna `true`.
- El pivot **no** tiene `updated_at` para minimizar escrituras. El modelo usa `->withPivot('created_at')` (no `withTimestamps()`).
