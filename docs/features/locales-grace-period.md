# Locales — período de gracia de 15 días al borrar

Cuando el super_admin elimina un local desde `/admin/locales`, ya no se
borra inmediatamente. Queda **soft-deleted** y aparece en el filtro nuevo
**"Borrados"** con un contador regresivo. Si en 15 días no se reactiva,
un cron lo elimina **definitivamente**.

## Por qué

- Permite **revertir errores** de borrado humano sin tener que rescatar de
  backup.
- 15 días es ventana suficiente para que el dueño del local se queje si
  fue por accidente.
- Después de 15 días los datos del local son ruido (no se está usando)
  y compactar la BD ayuda con queries.

## Flow

```
super_admin click "Borrar"
  ↓
confirm("Quedará desactivado por 15 días — puedes recuperarlo en ese tiempo")
  ↓
DELETE /admin/locales/{id} → Local::delete() (soft delete, sets deleted_at)
  ↓
Local aparece en filtro "Borrados" con counter "se elimina en N días"
  ↓
Si super click "Reactivar":
  POST /admin/locales/{id}/restore → restaurado, vuelve a "Todos"
  ↓
Si pasan 15 días sin reactivar:
  cron semanal `php artisan locales:purge --days=15`
  → forceDelete() → fila borrada definitivamente de la BD
```

## Implementación

### Backend

- **Modelo `Local`**: ya tenía `use SoftDeletes` (no cambió).
- **`LocalController@destroy`**: ya usaba `$local->delete()` (soft) — no cambió.
- **`LocalController@index`**:
  - Nuevo filtro `?estado=borrados` retorna solo `whereNotNull('deleted_at')`.
  - Filtro `todos` ahora incluye `withTrashed()`.
- **`LocalResource`**: agrega 2 campos nuevos:
  - `deleted_at`
  - `will_purge_at` (`deleted_at + 15 días`, lo calcula el resource)
- **Comando nuevo `App\Console\Commands\PurgeLocalesCommand`**:
  ```bash
  php artisan locales:purge --days=15
  ```
  Hace `Local::onlyTrashed()->where('deleted_at', '<', now()->subDays(15))->forceDelete()`.

### Frontend

- **`/admin/locales/page.tsx`**:
  - Filtro nuevo "Borrados" en la lista de chips.
  - `handleRestore()` que llama `POST /admin/locales/{id}/restore`.
  - `LocalCard` muestra banner naranja arriba si `deleted_at` está presente
    con el counter "se elimina en N días" y botón "Reactivar".
  - Mensaje del `confirm()` actualizado para reflejar el grace period.

## Cron a agregar en hPanel (NO automatizado)

| Frecuencia | Comando |
|---|---|
| Semanal domingos 3:30am (`30 3 * * 0`) | `cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && /opt/alt/php83/usr/bin/php artisan locales:purge --days=15 > /dev/null 2>&1` |

## Edge cases

- Restaurar después de 14 días 23h: funciona perfecto, el cron aún no corre.
- Restaurar exactamente cuando el cron corre: race condition mínima. La probabilidad
  es baja (1 minuto/semana). Si pasa, el local queda perdido — se recupera del
  backup semanal de Hostinger.
- Borrar y volver a borrar tras restaurar: el contador se resetea a 15 días desde
  el último delete.
