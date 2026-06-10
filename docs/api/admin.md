# API — Endpoints super_admin

Prefijo `/admin/*`. Middleware: `auth:sanctum` + `super_admin`.

> Las acciones aquí **NO** están scopeadas por tenant — operan globalmente.

## Locales

### GET `/admin/locales`
Lista global con conteos y owner. Filtros:
- `?q=texto` — LIKE en `nombre` o `slug`
- `?estado=activos|suspendidos|todos` (default `todos`)

### POST `/admin/locales`
Alta de un local + opcionalmente su owner inicial.

Body:
```json
{
  "nombre": "Sushi 33",
  "slug": "sushi-33",          // opcional, se auto-genera de nombre
  "tagline": "...",
  "whatsapp": "5215512345678",
  "telefono": "...",
  "email_contacto": "...",
  "direccion": "...",
  "color_primario": "#0070F3",
  "color_secundario": "#0B0B0F",
  "color_fondo": "#FAFAF7",
  "tipografia": "Bricolage Grotesque",
  "delivery_fee": 35,
  "delivery_min_minutos": 30,
  "owner": {                    // opcional — si se pasa crea owner y lo vincula
    "nombre": "Hiro Tanaka",
    "email": "hiro@sushi33.mx",
    "password": "secret123",
    "password_confirmation": "secret123"
  }
}
```

Validación: `StoreLocalRequest`. Slugs UNIQUE, email del owner UNIQUE en `users`.

**201** → `LocalResource` (incluye `public_url`).

### GET `/admin/locales/{id}`
Detalle con `productos_count`, `categorias_count`, `pedidos_count`, owner.

### PATCH `/admin/locales/{id}`
Actualiza branding/contacto/operación. Validación: `UpdateLocalRequest`. (Superset de `UpdateBrandingRequest`).

### DELETE `/admin/locales/{id}`
Soft-delete del local (no toca cascadas hard).

### POST `/admin/locales/{id}/suspender`
`suspendido = true`. La landing pública deja de aparecer (deja de ser `activos()`).

### POST `/admin/locales/{id}/reactivar`
`suspendido = false`, `activo = true`.

---

## Usuarios del local

### GET `/admin/locales/{id}/usuarios`
Lista de usuarios vinculados al local. Útil para que super_admin sepa a quién va a resetear la contraseña.

**200**
```json
{
  "data": [
    { "id": 2, "nombre": "...", "email": "...", "rol": "owner" },
    { "id": 7, "nombre": "...", "email": "...", "rol": "staff" }
  ]
}
```

### PATCH `/admin/locales/{id}/owner-password`
**Throttle `10/min`**.

Resetea la contraseña del owner del local. **No requiere** contraseña actual.

Body:
```json
{
  "password": "nueva-segura-789",
  "password_confirmation": "nueva-segura-789",
  "user_id": 2            // opcional — si hay varios usuarios, escoger
}
```

Si no se pasa `user_id`, agarra al primer `rol=owner` del local.

Al éxito: **borra todos los tokens del owner** (debe re-loguearse en todos sus dispositivos).

**200**
```json
{
  "message": "Contraseña del owner actualizada.",
  "owner": { "id": 2, "nombre":"...", "email":"..." }
}
```

**404** si el local no tiene owner.

---

## Lo que NO existe (aún)

- ❌ Crear un staff vinculado a un local (sólo owner se crea desde aquí).
- ❌ Métricas globales agregadas (la única métrica multi-local es manual contra la BD).
- ❌ Transferir un local a otro owner.
- ❌ Endpoint para forzar `cerrado_temporal` desde admin (sólo desde `/local/horarios` del owner).

Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md).
