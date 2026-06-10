# API — Errores

## Forma de los errores

### 401 No autenticado
```json
{ "message": "No autenticado" }
```
Devuelto por el handler en `bootstrap/app.php`. Cualquier `AuthenticationException` en `/api/*`.

### 403 Sin permiso
```json
{ "message": "Sólo super_admin" }
```
ó
```json
{ "message": "Tu usuario no está vinculado a un local. Contacta al administrador." }
```
Devuelto por `EnsureSuperAdmin` o `EnforceTenantScope`.

Las **Policies** también lanzan `AuthorizationException` → Laravel responde 403 sin cuerpo personalizado por defecto.

### 404 Not Found
- `Symfony\Component\HttpKernel\Exception\NotFoundHttpException` — devuelta por `findOrFail`, `firstOrFail`, route model binding inexistente.

```json
{ "message": "Local no encontrado o no disponible." }
```

### 409 Conflict — dominio

**Stock insuficiente:**
```json
{
  "message": "Stock insuficiente: Tortilla (necesario 4 pz, hay 2 pz)",
  "faltantes": [
    { "ingrediente": "Tortilla", "requerido": 4, "disponible": 2, "unidad": "pz" }
  ]
}
```

**Local cerrado** (`POST /public/pedidos/{slug}`):
```json
{
  "message": "Tacos El Gordo no está aceptando pedidos: Cerrado · abre mañana a las 12:00.",
  "estado": {
    "abierto": false, "mensaje": "...",
    "proxima_apertura": "12:00", "proximo_cierre": null
  }
}
```

**Categoría con productos** (`DELETE /categorias/{id}`):
```json
{ "message": "No se puede eliminar: la categoría tiene productos. Reasígnalos primero." }
```

**Ingrediente con recetas** (`DELETE /ingredientes/{id}`):
```json
{ "message": "No se puede eliminar: hay productos con receta que lo usan." }
```

**Compra no reversible** (`DELETE /compras/{id}`):
```json
{
  "message": "No se puede anular: parte del inventario ya se consumió.",
  "faltantes": [
    { "ingrediente":"Pollo", "comprado": 5, "stock_actual": 2, "unidad": "kg" }
  ]
}
```

### 422 Validation
Devuelta por todos los `FormRequest`. Forma:

```json
{
  "message": "El campo email es obligatorio. (y 2 más)",
  "errors": {
    "email":    ["El campo email es obligatorio."],
    "password": ["La contraseña debe tener al menos 8 caracteres."]
  }
}
```

**422 con regla de negocio en validator** (ej. `POST /public/pedidos/{slug}` fuera de radio):
```json
{ "message": "Tu dirección está fuera del radio de entrega (5 km). Distancia: 7.3 km." }
```

### 429 Too Many Requests
Devuelta por el throttle middleware. Incluye headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

`POST /auth/login` cuando se acumulan 5 intentos por IP+email:
```json
{
  "message": "...",
  "errors": { "email": ["Demasiados intentos. Intenta de nuevo en 45s."] }
}
```

### 500 Server error
Si `APP_DEBUG=true` → pantalla Ignition (sólo en dev).
En producción: respuesta JSON genérica (Laravel default).

## Convenciones

- **`message`** siempre es string legible en español.
- **`errors`** sólo en 422; estructura `{ "campo.con.dot.notation": ["msg1", "msg2"] }`.
- **`faltantes`** es la "envoltura especial" cuando hay un problema de stock — usar siempre el mismo nombre.
- **`estado`** se incluye en errores del horario para que el cliente pueda mostrar la info al usuario sin pegar otra request.

## Para implementadores frontend

- Axios devuelve los detalles en `error.response.data`. Patrón usado en el frontend:

```ts
try { await api.post(...); }
catch (err: any) {
  const msg =
    err?.response?.data?.errors?.email?.[0]
    ?? err?.response?.data?.message
    ?? 'Ocurrió un error.';
  toast.error(msg);
}
```

- 401 limpia el token automáticamente (interceptor de `apps/web/src/lib/api.ts`).
