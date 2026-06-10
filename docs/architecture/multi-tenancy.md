# Arquitectura — Multi-tenancy

ClickToEat usa **single database, scope por columna**. Cada tabla "del negocio" tiene `local_id` y todas las queries de un usuario autenticado se filtran automáticamente por su local.

## Las 3 piezas

1. **`App\Support\TenantContext`** — singleton que guarda el `local_id` activo del request en curso.
2. **`App\Models\Scopes\TenantScope`** — `GlobalScope` que añade `WHERE local_id = ?` a cualquier query.
3. **`App\Models\Concerns\BelongsToTenant`** — trait que aplica el scope y autollena `local_id` en `creating`.

Ver fuentes:
- `apps/api/app/Support/TenantContext.php`
- `apps/api/app/Models/Scopes/TenantScope.php`
- `apps/api/app/Models/Concerns/BelongsToTenant.php`

## El flujo (request autenticado)

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. Request entra con `Authorization: Bearer <sanctum-token>`        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. Middleware `auth:sanctum` resuelve el User                       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. Middleware `tenant` (EnforceTenantScope):                        │
│    - si super_admin → no setea TenantContext (acceso global)        │
│    - si user sin local_id → 403                                     │
│    - si owner/staff → TenantContext::set($user->local_id)           │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4. Cualquier query Eloquent sobre un modelo con BelongsToTenant     │
│    automáticamente incluye `WHERE <tabla>.local_id = $id`            │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 5. Cualquier `Model::create([...])` autollena `local_id` si no se   │
│    proporcionó (vía `creating` hook del trait).                     │
└────────────────────────────────────────────────────────────────────┘
```

## Modelos con `BelongsToTenant`

Tienen scope automático y autofill de `local_id`:

- `Categoria`
- `Producto`
- `Pedido`
- `Ingrediente`
- `MovimientoInventario`
- `Compra`
- `Notificacion`

## Modelos SIN `BelongsToTenant`

- `Local` — **es el tenant en sí**, no se filtra a sí mismo.
- `User` — los super_admin no tienen `local_id`; el filtrado se hace explícito cuando hace falta.
- `Receta` — pertenece a `Producto`, hereda el aislamiento por la FK.
- `DetallePedido`, `DetalleCompra` — pertenecen a `Pedido`/`Compra`, mismo principio.

## Bypassear el scope (cuándo y cómo)

Hay 3 razones legítimas para usar `withoutGlobalScopes()` o `withoutTenantScope()`:

1. **El endpoint público** (`/menu/{slug}`, `POST /pedidos/{slug}`) — no hay usuario autenticado, el local viene del slug.
2. **Super admin** — usa el bypass del middleware (no setea TenantContext), por lo que el scope queda inerte.
3. **Casos puntuales en services** — ver ejemplo en `OrderService::crear()`:
   ```php
   Producto::query()
       ->withoutTenantScope()
       ->where('local_id', $local->id)  // explícito siempre
       ->whereIn('id', $productoIds)
       ->where('disponible', true)
       ->get();
   ```
   Cuando se usa `withoutTenantScope`, **siempre** acompañarlo de un `where('local_id', ...)` explícito.

## Por qué singleton

```php
// AppServiceProvider::register()
$this->app->singleton(\App\Support\TenantContext::class);
```

Sin singleton, el middleware crearía una instancia y el GlobalScope leería otra distinta — el scope nunca se aplicaría. Es una falla silenciosa: las queries devuelven todo y los locales se ven entre sí. **No quitar el singleton.**

## Casos límite

- **Super admin con `local_id` asignado:** `EnforceTenantScope` chequea `isSuperAdmin()` *antes* de validar `local_id`. Sale por la rama "no setea TenantContext", igual ve todo. Si tuviera `local_id`, es ignorado.
- **Endpoint público vs middleware `tenant`:** rutas `public/*` están fuera del grupo `auth:sanctum`/`tenant`, por eso no hay tenant settado — usan el slug para encontrar el local.
- **POS interno (`POST /pedidos`):** corre dentro de `tenant`, así que `OrderService` recibe un `Local` cargado vía `Local::withoutGlobalScopes()->findOrFail($user->local_id)`. El `Local` mismo no necesita scope.

## Test patterns

`SuperAdminLocalesTest`, `InventarioAvanzadoTest` y otros validan:
- Owner del local A no ve datos del local B.
- super_admin sí ve ambos.
- Endpoint público funciona sin token.

Ver [`testing/suites.md`](../testing/suites.md).

## Anti-patrones a evitar

- ❌ **Confiar en el JS del cliente** para no enviar `local_id` ajeno. El scope es la última línea de defensa.
- ❌ **Hacer joins en raw SQL sin condicionar `local_id`** — pierden el filtro.
- ❌ **`DB::table('productos')` en lugar de `Producto::query()`** — `DB::table` salta el scope.
- ❌ **Service que recibe `local_id` como parámetro y lo confía** — siempre comparar contra `$user->local_id` o usar `withoutTenantScope() + where('local_id', $local->id)`.
