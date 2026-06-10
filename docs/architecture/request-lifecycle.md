# Arquitectura — Ciclo de vida de una petición

Trazo desde que un request entra hasta que el JSON sale.

## Punto de entrada

- **HTTP** → `apps/api/public/index.php`
- **Bootstrap** → `apps/api/bootstrap/app.php` (registra middleware aliases, throttling, exceptions, prefijo `api/v1`)

## Pipeline global

Aplicado a **todo** request bajo `/api/v1/*`:

```
1. HandleCors                (allowed origin = FRONTEND_URL)
2. throttle:60,1             (60 requests/minuto por IP/usuario)
```

Más específicos (anidados):

- `auth/login` → `throttle:10,1`
- `auth/register`, `auth/me/password`, `admin/locales/*/owner-password` → `throttle:5,1` o `10,1`
- `public/pedidos/{slug}` → `throttle:20,1`
- `uploads/image` → `throttle:30,1`

## Grupos de rutas (de `routes/api.php`)

### Públicas — sin auth

| Ruta                                | Middleware adicional      |
|-------------------------------------|---------------------------|
| `GET  /public/locales`              | —                         |
| `GET  /public/menu/{slug}`          | —                         |
| `POST /public/pedidos/{slug}`       | `throttle:20,1`           |
| `GET  /menu/{slug}`                 | alias retro-compatible    |
| `POST /auth/register`               | `throttle:5,1`            |
| `POST /auth/login`                  | `throttle:10,1`           |

### Auth básico — sólo sanctum

| Ruta                       | Middleware    |
|----------------------------|---------------|
| `GET  /auth/me`            | `auth:sanctum`|
| `POST /auth/logout`        | `auth:sanctum`|
| `PATCH /auth/me/password`  | `auth:sanctum` + `throttle:5,1` |

### Tenant scoped — owner / staff

```php
Route::middleware(['auth:sanctum', 'tenant'])->group(fn () => ...);
```

Cubre: `/dashboard`, `/local`, `/local/horarios`, `/metricas`, `/categorias`, `/productos`, `/recetas`, `/ingredientes`, `/compras`, `/notificaciones`, `/pedidos`, `/uploads/image`.

### Super admin — global

```php
Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(fn () => ...);
```

Cubre: `/admin/locales/*` (incluye `suspender`, `reactivar`, `usuarios`, `owner-password`).

## Dentro del controller

Patrón típico de una acción tenant-scoped:

```
1. FormRequest (validación + authorize)
       │
       ├─ authorize() llama a $user->can('action', $modelClassOrInstance)
       │  → Policy decide
       │
       ▼
2. Controller recibe Request validado
       │
       ├─ $this->authorize('view', $resource)  // sólo para acciones puntuales
       │
       ▼
3. Eloquent query con GlobalScope (TenantScope) ya aplicado
       │
       ▼
4. Service (si la lógica no es trivial) — Orders / Inventory / Compras / Metricas
       │  Pueden envolver en DB::transaction(), bloquear con FOR UPDATE, etc.
       │
       ▼
5. Resource (transformer JSON)
       │
       ▼
6. response()->json() — o `Resource::collection(...)`
```

## Manejo de excepciones

Definido en `bootstrap/app.php` → `withExceptions(...)`:

- `AuthenticationException` en `/api/*` → `401 {"message":"No autenticado"}`
- `ValidationException` en `/api/*` → `422 {"message", "errors"}`

Excepciones de dominio que cada controller maneja explícitamente:

| Excepción                            | HTTP | Devuelve                              |
|-------------------------------------|------|---------------------------------------|
| `InsufficientStockException`         | 409  | `{message, faltantes:[...]}`          |
| `CompraNoReversibleException`        | 409  | `{message, faltantes:[...]}`          |
| `NotFoundHttpException`              | 404  | `{message}`                            |
| `RuntimeException` genérica          | 500  | Por defecto, Ignition en dev          |

## Logging

- Driver: `stack` (file + stderr).
- Nivel: `debug` en dev, ajustable por `LOG_LEVEL`.
- PHP errors → `storage/logs/php.log` (configurado en `docker/php/php.ini`).
- Laravel → `storage/logs/laravel.log`.

## Trazabilidad de un pedido público (ejemplo end-to-end)

```
POST /api/v1/public/pedidos/tacos-el-gordo
   │
   ├─ throttle:60,1 + throttle:20,1
   ├─ StorePublicPedidoRequest::authorize() → true
   ├─ StorePublicPedidoRequest::rules() → 422 si payload inválido
   │
   ▼
PublicPedidoController::store($req, $slug)
   ├─ Local::activos()->bySlug($slug)->first()  → 404 si no
   ├─ HorarioCalculator::estado($local)
   │      └─ si cerrado → 409 con {message, estado}
   ├─ Si entrega delivery + tiene lat/lng cliente → valida radio (haversine)
   ├─ OrderService::crear($local, $input)
   │      ├─ DB::transaction(
   │      │     │
   │      │     ├─ Productos del local + disponibles
   │      │     ├─ Snapshot lineas + subtotal
   │      │     ├─ Pedido::create + DetallePedido::create xN
   │      │     ├─ InventoryService::descontarParaPedido
   │      │     │      ├─ lockForUpdate sobre ingredientes
   │      │     │      ├─ throw InsufficientStockException si stock < requerido
   │      │     │      ├─ baja stock + crea MovimientoInventario
   │      │     │      └─ si cruza stock_minimo → Notificacion::create('bajo_stock')
   │      │     └─ WhatsAppLinkBuilder::buildForPedido
   │      │           └─ $pedido->whatsapp_url = wa.me/<num>?text=...
   │      │   )
   │      └─ return $pedido
   │
   ▼
PedidoResource → response 201 con whatsapp_url
```
