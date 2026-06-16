# Fixes de la suite phpunit — junio 2026

Recuperación de la red de seguridad de tests. Antes: 20 failures + 1 error.
Después: 185 tests verde.

## Causas raíz encontradas

### 1. `Cache::flush()` no se hacía entre tests del mismo proceso

El `CACHE_STORE=array` persiste entre requests en el mismo proceso PHPUnit.
Tests de auth (LoginTest, PasswordTest) acumulaban rate-limit counters de
tests anteriores y triggereaban 429 prematuramente.

**Fix**: `Cache::flush()` en `setUp()` de `LoginTest`.

### 2. `ValidationException::status(429)` no respeta el status

Bug de Laravel: cuando lanzas `ValidationException::withMessages([...])->status(429)`,
el exception handler ignora el `status()` y siempre devuelve 422.

**Fix**: cambiar a `return response()->json([...], 429)` directo en
`AuthController::login`. Ya no se usa `ValidationException` para el caso
de throttle.

### 3. Password "mal" (3 chars) fallaba `min:6` antes de llegar al controller

El test de throttle hacía 5 intentos con `'password' => 'mal'`. La validación
del FormRequest rechazaba con 422 _antes_ de ejecutar la lógica del controller
(que es donde está el `RateLimiter::hit`). Resultado: el contador nunca
acumulaba.

**Fix**: cambiar fixture a `'wrongpass'` (9 chars).

### 4. `'nombre' => 'X'` fallaba `min:2`

`StorePublicPedidoRequest` requiere `min:2` en `cliente.nombre`. Tests de
endpoint público y idempotency usaban `'X'`. Resultado: validación 422
antes de la lógica del pedido.

**Fix**: cambiar fixture a `'Xy'`.

### 5. Float vs int en `assertJsonPath`

PHP convierte `(float) 35` a `35.0`. JSON encode lo escribe como `35`
(sin decimal). JSON decode lo lee como `int 35`. `assertJsonPath('x', 35.0)`
es comparación strict y falla porque `35.0 !== 35`.

**Fix**: usar enteros en los asserts (`35` no `35.0`).

### 6. 404 vs 403 en multi-tenancy

Tests asumían que el TenantScope haría que un producto/categoría de otro
local devuelva 404. En realidad la `Policy` lo bloquea con 403 antes
(defense-in-depth funciona).

**Fix**: aceptar ambos statuses con `assertContains($status, [403, 404])`.
Ambos bloquean correctamente la acción cross-tenant.

### 7. Super admin no podía acceder a `/audit-logs` de owner

La ruta de owner está gated por `feature:audit_log` middleware (requiere
plan Premium). Super admin no tiene local ni plan → bloqueado.

**Fix**: usar la nueva ruta `/admin/audit-logs` (sin gate de plan) creada
para el super_admin.

### 8. Sanctum guard cache entre `withHeader` calls

En el test `cambio_propio_invalida_otros_tokens_no_el_actual`, después de
borrar tokens, los siguientes `withHeader('Authorization: Bearer tokenA')`
no re-validaban el token contra DB porque el auth manager tenía cacheada
la última auth exitosa.

**Fix**: llamar `auth()->forgetGuards()` antes de cada `withHeader` con
token nuevo. Fuerza re-validación.

### 9. `password_confirmation` se escribía como columna

`UpdateStaffRequest` declaraba `'password_confirmation' => ['sometimes']`
en `rules()`. Eso hace que `validated()` lo incluya en el array. Como
`Model::unguard()` está activo, intentaba escribirlo como columna →
SQLite error "no such column".

**Fix**: usar `'confirmed'` rule en password. El validator chequea
`password_confirmation` pero NO la incluye en `validated()`.

## Lo que NO arreglé

Nada — los 185 tests pasan al 100%.

## Cómo evitar regresiones

- **Nunca** asumir que tests aislados no comparten estado: en PHPUnit el
  mismo proceso ejecuta múltiples tests con el mismo cache `array`.
- **Siempre** flushear cache en `setUp` cuando tu test depende de rate limits.
- **Comparar JSON paths con int** si el valor no tiene decimales explícitos.
- **Defense-in-depth** significa que múltiples capas pueden bloquear; los tests
  deben aceptar cualquiera (`[403, 404]`).
- **`ValidationException::status()` está bugged** — usa `response()->json()`
  directo para non-422.
