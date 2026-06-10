# Modelo — `Local`

Fuente: `apps/api/app/Models/Local.php`. Tabla: `locales`.

## Rol

**Es el tenant.** Cada fila aquí es un negocio independiente con su propio menú, branding, pedidos, inventario.

## Traits

- `HasFactory`
- `SoftDeletes`
- ❌ NO usa `BelongsToTenant` (sería filtrarse contra sí mismo).

## Fillable

```
nombre, slug, tagline, logo_url, banner_url,
color_primario, color_secundario, color_fondo, tipografia, dark_mode,
whatsapp, telefono, email_contacto, direccion, lat, lng,
horarios, zona_entrega, zona_horaria,
delivery_fee, delivery_min_minutos, delivery_radio_km,
metodos_pago, redes_sociales,
activo, suspendido, cerrado_temporal, modulos,
owner_id
```

## Casts

| Campo                  | Cast        |
|------------------------|-------------|
| `horarios`              | array (JSON) |
| `zona_entrega`          | array        |
| `redes_sociales`        | array        |
| `metodos_pago`          | array        |
| `modulos`               | array        |
| `dark_mode`             | boolean      |
| `activo`                 | boolean      |
| `suspendido`             | boolean      |
| `cerrado_temporal`        | boolean      |
| `delivery_fee`           | decimal:2    |
| `lat`, `lng`            | decimal:7    |

## Relaciones

| Método      | Tipo                  | Notas                                            |
|------------|-----------------------|--------------------------------------------------|
| `owner()`   | BelongsTo User         | Por `owner_id`                                   |
| `usuarios()` | HasMany User           | Por `local_id` — owner y staff vinculados        |
| `categorias()`| HasMany Categoria     |                                                  |
| `productos()`| HasMany Producto       |                                                  |
| `ingredientes()`| HasMany Ingrediente |                                                  |
| `pedidos()`  | HasMany Pedido         |                                                  |

## Scopes

- `scopeActivos($q)` → `where('activo', true)->where('suspendido', false)`. **No** considera `cerrado_temporal` (un local cerrado temporal sigue listado, pero `HorarioCalculator` lo marca como cerrado).
- `scopeBySlug($q, $slug)` → atajo `where('slug', $slug)`.

## Route key

`getRouteKeyName(): 'slug'` → route model binding usa slug por default.

Pero `routes/api.php` usa `{local:id}` explícito en `/admin/locales/{local:id}` para forzar binding por id (super_admin trabaja con IDs).

## Notas

- `modulos` es un JSON reservado para flags por local (feature flags por tenant) — hoy sin uso.
- `cerrado_temporal` lo gestiona el owner desde `/local/horarios`.
- `suspendido` lo gestiona el super_admin desde `/admin/locales/{id}/suspender`.

Ver también: [`architecture/multi-tenancy.md`](../architecture/multi-tenancy.md), [`features/branding.md`](../features/branding.md), [`features/horarios.md`](../features/horarios.md).
