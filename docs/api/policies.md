# API — Policies (autorización)

Cada modelo expuesto tiene una Policy en `apps/api/app/Policies/`. Se invocan desde:
- Controllers (`$this->authorize('action', $model)`)
- FormRequests (`$user->can('action', $resource)` dentro de `authorize()`)

Registradas en `AuthServiceProvider`.

## Patrón común

Todas las policies tienen un `before()`:
```php
public function before(User $user, string $ability): ?bool
{
    if ($user->isSuperAdmin()) {
        return true;
    }
    return null;
}
```
→ super_admin siempre pasa, sin importar el resto.

## Matriz: quién puede qué

(Después del bypass de super_admin)

### LocalPolicy

| Acción      | owner del local | staff del local | otro owner | otro staff |
|------------|------------------|------------------|-----------|-----------|
| `viewAny`   | ✅               | ✅                | ✅        | ✅         |
| `view`      | ✅ (su local)   | ✅ (su local)   | ❌        | ❌         |
| `update`    | ✅               | ❌                | ❌        | ❌         |
| `delete`    | ❌ (sólo super) | ❌                | ❌        | ❌         |
| `suspend`   | ❌                | ❌                | ❌        | ❌         |

### CategoriaPolicy

| Acción     | owner | staff | otro |
|------------|-------|-------|------|
| `viewAny`  | ✅    | ✅    | ❌   |
| `view`     | ✅ (su local) | ✅ (su local) | ❌ |
| `create`   | ✅    | ❌    | ❌   |
| `update`   | ✅    | ❌    | ❌   |
| `delete`   | ✅    | ❌    | ❌   |

### ProductoPolicy

| Acción         | owner | staff | otro |
|----------------|-------|-------|------|
| `viewAny`       | ✅    | ✅    | ❌   |
| `view`          | ✅    | ✅    | ❌   |
| `create`        | ✅    | ❌    | ❌   |
| `update`        | ✅    | ❌    | ❌   |
| `delete`        | ✅    | ❌    | ❌   |
| `uploadImage`   | ✅    | ❌    | ❌   |

### IngredientePolicy

| Acción     | owner | staff | otro |
|------------|-------|-------|------|
| `viewAny`  | ✅    | ✅    | ❌   |
| `view`     | ✅    | ✅    | ❌   |
| `create`   | ✅    | ❌    | ❌   |
| `update`   | ✅    | ✅    | ❌   |
| `delete`   | ✅    | ❌    | ❌   |

### RecetaPolicy

| Acción     | owner | staff | otro |
|------------|-------|-------|------|
| `viewAny`  | ✅ del producto | ❌ | ❌ |
| `manage`   | ✅ del producto | ❌ | ❌ |
| `delete`   | ✅ del producto | ❌ | ❌ |

### PedidoPolicy

| Acción          | owner | staff | otro |
|-----------------|-------|-------|------|
| `viewAny`        | ✅    | ✅    | ❌   |
| `view`           | ✅    | ✅    | ❌   |
| `updateEstado`   | ✅    | ✅    | ❌   |
| `delete`         | ✅    | ❌    | ❌   |

### CompraPolicy

| Acción     | owner | staff | otro |
|------------|-------|-------|------|
| `viewAny`  | ✅    | ✅    | ❌   |
| `view`     | ✅    | ✅    | ❌   |
| `create`   | ✅    | ✅    | ❌   |
| `delete`   | ✅    | ❌    | ❌   |

### NotificacionPolicy

| Acción     | owner | staff | otro |
|------------|-------|-------|------|
| `view`     | ✅    | ✅    | ❌   |
| `update`   | ✅    | ✅    | ❌   |

(Las acciones `viewAny` no están en la policy explícita — el controller filtra por `TenantScope`.)

## Implícitos críticos

- **Verifican `local_id === resource.local_id`** — la doble check defiende contra una falla del TenantScope o un endpoint sin scope.
- **staff puede ajustar inventario** (`update` en Ingrediente) pero **no crear/borrar** — refleja el caso de uso real (cajero cuenta lo que sale, gerente decide qué ingredientes existen).
- **staff no puede tocar productos ni categorías** — sólo el owner cambia el catálogo.
- **staff puede crear compras** — útil cuando staff recibe mercancía. (Esta es una decisión: cuestionable si el negocio prefiere que sólo el owner registre compras.)

## Cómo añadir una policy nueva

1. `php artisan make:policy NombrePolicy --model=Nombre`
2. Implementar métodos. Empezar siempre con `before(...)` que pasa a super_admin.
3. Registrar en `AuthServiceProvider::$policies`.
4. Invocar desde controller (`$this->authorize(...)`) o FormRequest (`$user->can(...)`).
5. Actualizar este documento.
