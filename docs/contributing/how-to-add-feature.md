# Contribución — Cómo agregar un feature

Receta paso a paso. Ejemplo: "quiero agregar **cupones** que descuentan un % del total del pedido".

## 1. Diseña la idea (15 min)

- ¿A qué tabla afecta? ¿Tabla nueva o columna en existente?
- ¿Endpoints nuevos? ¿Modifica los actuales?
- ¿Quién puede usarlos? (Policy)
- ¿Cambia algo del frontend?
- ¿Hay decisiones grandes? → Escribir un ADR (`docs/decisions/ADR-NNN-cupones.md`) antes de codear.

## 2. Migración (30 min)

```bash
docker compose exec api php artisan make:migration create_cupones_table
```

- Editar la migración nueva: columnas, índices, FK con cascadas correctas.
- Si tocas una tabla existente, añadir migración separada y usar `Schema::hasColumn(...)` para idempotencia.
- Probar en MySQL **y** mentalmente en sqlite (tests). Si tocas `enum` o `change()`, agregar guard `if (DB::connection()->getDriverName() !== 'mysql') return;`.

```bash
docker compose exec api php artisan migrate
docker compose exec api php artisan migrate:rollback   # verifica la reversa
```

Actualizar:
- `docs/database/schema.md` (nueva tabla / columna).
- `docs/database/migrations.md` (lista).
- `docs/database/relationships.md` (si añade FK).
- `docs/database/erd.md` si afecta el diagrama.

## 3. Modelo Eloquent (15 min)

```bash
docker compose exec api php artisan make:model Cupon
```

- `$fillable`, `casts()`, relaciones, `BelongsToTenant` trait si tiene `local_id`.
- Crear `docs/models/cupon.md`.

## 4. Policy (15 min)

```bash
docker compose exec api php artisan make:policy CuponPolicy --model=Cupon
```

- `before()` con bypass super_admin.
- `viewAny`, `view`, `create`, `update`, `delete`.
- Registrar en `AuthServiceProvider::$policies`.
- Actualizar `docs/api/policies.md` con la matriz.

## 5. FormRequests (20 min)

```bash
docker compose exec api php artisan make:request Cupon/StoreCuponRequest
docker compose exec api php artisan make:request Cupon/UpdateCuponRequest
```

- `authorize()` llama a la policy.
- `rules()` exhaustivas.
- `prepareForValidation()` para auto-slug si aplica.

Actualizar `docs/api/form-requests.md`.

## 6. Resource (10 min)

```bash
docker compose exec api php artisan make:resource CuponResource
```

- Casts explícitos (`(float)`, `(int)`, `(bool)`).
- Fechas con `?->toIso8601String()`.
- `whenLoaded`, `whenCounted` para relaciones.

Actualizar `docs/api/resources.md`.

## 7. Controller (30 min)

```bash
docker compose exec api php artisan make:controller Api/CuponController --api
```

- Inyectar services en constructor con property promotion.
- `$this->authorize(...)` en cada acción puntual (show/update/delete).
- Lógica trivial inline; lógica de dominio → service.

Actualizar `docs/api/tenant.md` (o el que aplique).

## 8. Service (si hay lógica) (30 min)

`app/Services/Cupones/CuponService.php`.

- Métodos: `aplicar(Pedido $p, string $codigo): float`, `validar(...)`, etc.
- Debe correr dentro de `DB::transaction` cuando hace mutaciones.
- Lanza excepciones de dominio (`CuponNoValidoException`).

Actualizar `docs/features/cupones.md` con el flujo.

## 9. Ruta (5 min)

`routes/api.php`:

```php
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    // ... existente
    Route::apiResource('cupones', CuponController::class);
});
```

## 10. Tests (45 min)

`tests/Feature/CuponesTest.php`. Cubrir:
- Crear cupón ok.
- Validación falla con mal código.
- Owner no ve cupones de otro local.
- Aplicar cupón válido descuenta el total.
- Aplicar cupón vencido → 409.
- Aplicar cupón ya usado → 409.

Mínimo: **un test por código de respuesta documentado**.

Actualizar `docs/testing/suites.md`.

## 11. Frontend (60 min — depende de UX)

- Tipos en `lib/types.ts`.
- Página `app/admin/cupones/page.tsx` con CRUD.
- Modificar checkout público (`app/[slug]/LandingClient.tsx`) para aceptar código de cupón.

Actualizar `docs/frontend/admin.md` con la nueva página.

## 12. Documentación

- ✅ Actualiza todos los `.md` listados arriba.
- Si añadiste alguna decisión grande, ADR.
- Si cambiaste el formato del mensaje WhatsApp, actualizar `apps/web/src/lib/whatsapp.ts` Y `app/Services/WhatsApp/WhatsAppLinkBuilder.php` Y `docs/features/whatsapp.md`.

## 13. PR

- Lint + tests + typecheck.
- Descripción siguiendo `docs/contributing/git-flow.md`.
- Screenshots si hay UI nueva.

## Checklist final

Antes de marcar el PR como listo para review:

- [ ] Migración up/down funciona.
- [ ] Modelo con relaciones + casts.
- [ ] Policy registrada en `AuthServiceProvider`.
- [ ] FormRequests autorizan + validan.
- [ ] Resource no expone más de lo necesario.
- [ ] Controller pequeño; lógica en Service.
- [ ] Tests cubren caso feliz + 2 negativos + scope multi-tenant.
- [ ] Endpoint documentado en `docs/api/*.md`.
- [ ] Modelo documentado en `docs/models/*.md`.
- [ ] Feature documentada en `docs/features/*.md`.
- [ ] Sin `dd()`, sin console.log, sin secretos.
- [ ] Pint y eslint limpios.
- [ ] phpunit verde.
- [ ] typecheck verde.
