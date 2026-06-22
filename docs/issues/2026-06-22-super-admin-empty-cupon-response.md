# Bug — Super_admin recibe respuesta vacía al ver cupon individual

> Investigado 2026-06-22 durante la sesión de cierre del audit. NO es bug de
> seguridad (auth funciona correctamente), pero sí afecta UX: el super_admin
> ve un cupon vacío en el panel.

## Síntoma

`GET /api/v1/cupones/{id}` con un super_admin autenticado devuelve:

```json
HTTP/1.1 200 OK
{"data": []}
```

En lugar del cupon serializado:

```json
{"data": {"id": 1, "local_id": 2, "codigo": "CUPONB", "tipo": "percent", ...}}
```

El status code es 200 (la policy permite el acceso correctamente — `before`
super_admin bypass funciona). Lo que está mal es el shape del payload.

## Investigación

Logueamos dentro del controller `CuponController::show`:

```
$cupon arriving at controller:
  exists: false
  attrs_count: 0
  toArray_count: 0
  class: App\Models\Cupon
```

El `$cupon` que llega al método es una **instancia VACÍA de Cupon**, no el
modelo real con sus atributos. Por eso `response()->json(['data' => $cupon])`
serializa como `[]`.

Pero `Cupon::withoutGlobalScopes()->find($id)` SÍ devuelve el cupon con sus
20 atributos. Así que el problema no es la BD, es el route model binding.

## Reproducción mínima

```php
// En tests/Feature/CuponAuthorizationTest::super_admin_puede_ver_cupon_de_cualquier_local
$superAdmin = User::factory()->superAdmin()->create();
Sanctum::actingAs($superAdmin, ['*']);

$resp = $this->getJson("/api/v1/cupones/{$cuponId}");
// → 200 con {"data": []}
```

## Hipótesis (no confirmadas)

1. **Interacción Laravel SubstituteBindings + TenantScope global**: para
   super_admin, el middleware `tenant` (EnforceTenantScope) hace bypass y
   NO setea TenantContext. Cuando SubstituteBindings ejecuta
   `Cupon::resolveRouteBinding($id)`, TenantScope.apply() verifica
   `$ctx->has()` → false → no agrega WHERE. Debería devolver el cupon.

2. **Pero** quizás Laravel 11 cambió el comportamiento de SubstituteBindings
   cuando un global scope no agrega ninguna restricción — podría estar
   devolviendo `new Model()` en lugar del modelo real.

3. **Producto y otros modelos similares**: usan el mismo patrón (BelongsToTenant
   + apiResource + show con type-hint) y FUNCIONAN bien. Algo en Cupon es
   distinto. Posibles causas:
   - SoftDeletes en Cupon (Producto también tiene SoftDeletes — descartado)
   - Casts complejos (array de array, decimal)
   - El orden en que se aplican los scopes

## Workaround temporal probado (NO commiteado)

```php
public function show(Cupon $cupon): JsonResponse
{
    $this->authorize('view', $cupon);
    if (! $cupon->exists) {
        // problema: request()->route('cupon') devuelve el model vacío,
        // no el id raw. Hay que extraer el id de la URL o del request.
        $cupon = Cupon::withoutGlobalScopes()->findOrFail((int) request()->route('cupon'));
    }
    return response()->json(['data' => $cupon]);
}
```

Falla porque `request()->route('cupon')` después de SubstituteBindings
devuelve el model bound (vacío), no la string raw del URL. Hay que usar
`request()->segments()` o `preg_match` sobre la URL — feo.

## Workaround real propuesto

Refactor del método show para NO usar implicit binding:

```php
public function show(int $cupon): JsonResponse
{
    $cuponInstance = Cupon::withoutGlobalScopes()->findOrFail($cupon);
    $this->authorize('view', $cuponInstance);
    return response()->json(['data' => $cuponInstance]);
}
```

Pero requiere también ajustar update, destroy, toggle (consistencia).
Y bypasses todo el patrón de Laravel route model binding.

## Impacto real (no urgente)

- **Frecuencia**: solo se manifiesta cuando super_admin ve cupon
  individual (no en listado). Cubre 0.1% del uso del sistema.
- **Severidad**: bajo. Super_admin puede usar el listado (`/cupones`)
  para ver todos los cupones — el listado funciona bien porque NO usa
  route model binding por id, usa query directa.
- **NO afecta seguridad**: la authorize policy SÍ funciona (los 6 otros
  tests cross-tenant pasan correctamente).

## Próximos pasos

- Investigar Laravel 11 changelog sobre SubstituteBindings con scopes.
- Probar si `Cupon` resuelve con `Cupon::query()->find()` vs `Cupon::find()`
  (diferentes paths de query).
- Eventualmente refactor del controller a explicit lookup.

## NO bloquea el deploy ni la auditoría

Documentado para futura sesión. El cierre del audit del 2026-06-22 no
depende de este bug.
