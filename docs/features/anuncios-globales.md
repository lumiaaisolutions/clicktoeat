# Anuncios globales

Banner persistente que el `super_admin` puede emitir desde `/admin/anuncios` y
que se muestra a **todos los owners** en el header de `/admin/...`. Útil para
avisar de mantenimiento programado, cambios de precio, nuevas features.

## Modelo

Tabla `anuncios_globales`:

| Columna         | Tipo                                  | Notas |
|-----------------|---------------------------------------|-------|
| `id`            | bigInt PK                             |       |
| `titulo`        | string(200)                           | bold del banner |
| `body`          | text                                  | descripción debajo |
| `severity`      | enum (info, warning, success, danger) | tono visual |
| `active`        | boolean                               | toggle global |
| `show_to_super` | boolean                               | si false, super no lo ve (solo owners) |
| `starts_at`     | timestamp nullable                    | si null, ya empezó |
| `ends_at`       | timestamp nullable                    | si null, no caduca |
| timestamps      |                                       |       |

Método `isVisibleNow(): bool` filtra por `active` + ventana de fechas.

## Endpoints

```
GET    /api/v1/admin/anuncios              super_admin   listado completo
POST   /api/v1/admin/anuncios              super_admin   crear
PATCH  /api/v1/admin/anuncios/{id}         super_admin   editar
DELETE /api/v1/admin/anuncios/{id}         super_admin   borrar

GET    /api/v1/anuncios/activos            auth          devuelve solo isVisibleNow()
```

El endpoint público devuelve solo los visibles ahora y, si el usuario es
super_admin, también respeta `show_to_super`.

## Frontend

- `apps/web/src/components/admin/AnuncioBanner.tsx` se monta en
  `apps/web/src/app/admin/layout.tsx` arriba del `<TrialBanner />` y consulta
  `/anuncios/activos` al login del usuario.
- El user puede cerrar el banner — el id queda en `localStorage` bajo
  `ce-anuncio-dismissed` (array de ids).
- `apps/web/src/app/admin/anuncios/page.tsx` — CRUD del super_admin con modal
  para crear/editar.

## Casos típicos

- "Mañana 2-4 AM CDMX hay mantenimiento" → severity `warning`, ventana de
  `starts_at` ayer + `ends_at` día siguiente.
- "Nueva integración con DiDi disponible" → severity `success`, sin ventana.
- "Importante: actualiza tu método de pago" → severity `danger`.
