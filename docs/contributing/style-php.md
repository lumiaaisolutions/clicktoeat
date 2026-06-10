# Contribución — Estilo PHP / Laravel

## Formateo automático

`laravel/pint` está instalado como dev. Correr antes de commitear:

```bash
docker compose exec api vendor/bin/pint
# o
cd apps/api && vendor/bin/pint
```

Pint usa preset Laravel (`PSR-12` + extras). No personalizar reglas sin discusión.

## Imports

- `use` agrupados por origen: `Illuminate\*`, `App\*`, `vendor\*`. Pint los ordena.
- Sin alias innecesarios. Sí alias cuando hay choque de nombre (`use App\Http\Controllers\Api\Public\PedidoController as PublicPedidoController`).

## Type hints

- **Siempre** declarar tipos de parámetros y retorno cuando sea posible.
- Usar `?Type` para nullable.
- Para arrays estructurados, usar phpstan/psalm annotations: `@param array<int, array{producto_id:int, cantidad:int}> $items`.

## Constructores

- **Property promotion** (PHP 8) preferido para inyección:
  ```php
  public function __construct(
      protected OrderService $orders,
      protected InventoryService $inventory,
  ) {}
  ```

## Eloquent

- `$fillable` siempre poblado (a pesar de `Model::unguard()` global — usar la lista como documentación).
- `casts()` como método protegido en lugar de `$casts` array (Laravel 11 style).
- `booted()` para hooks (no `boot()` heredado).
- Scopes con prefijo `scope`: `scopeActivos`, `scopeBySlug`.
- Relaciones siempre tipadas: `: HasMany`, `: BelongsTo`.

## Services

- **Lógica de dominio** vive en `App\Services\<Modulo>\<Service>`.
- Métodos públicos pequeños; helpers protegidos.
- Si hace mutaciones, debe correr dentro de `DB::transaction` (controller envuelve, service espera estar dentro).
- Validar invariantes con `LogicException` si la precondición es del programador (ej. "no estás en transacción").

## Excepciones

- Excepciones de dominio en `App\Services\<Modulo>\` (no en `app/Exceptions`).
- Constructor con datos relevantes (`InsufficientStockException(array $faltantes)`).
- Mensaje en español.

## Comentarios

- Sólo si añaden contexto no obvio (por qué, no qué).
- Docblock para servicios públicos: una sola línea de descripción + `@param` annotations si el shape es no trivial.
- No comentar imports o líneas autoexplicativas.

## Tests

- Nombre del método con underscores en español: `un_pedido_publico_se_crea_y_descuenta_inventario()`. Usa `/** @test */` para que PHPUnit los detecte.
- `RefreshDatabase` siempre en clases Feature.
- `Sanctum::actingAs($user, ['*'])` para auth.
- Helpers de setup en `setUp()` o método protegido `crearLocalDemo()` interno a la suite.

## Convenciones Laravel del proyecto

- **No** usar Facades en services nuevos cuando hay alternativa via DI (`Auth::user()` → `$request->user()`).
- **Sí** usar Facades para `DB`, `Storage`, `Hash`, `RateLimiter` — son convenientes y testeables.
- **Bootstrap.php** centraliza middleware aliases y exception handlers.
- **Auth abilities** definidas en `AuthController::abilitiesFor` — no esparcir.
