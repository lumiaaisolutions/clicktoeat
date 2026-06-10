# Runbook — Sincronizar `composer.lock` tras quitar `spatie/laravel-permission`

## Contexto

El 2026-06-10 se quitó `spatie/laravel-permission` del `composer.json` porque no se usaba (sin `HasRoles`, sin migraciones de permission_tables, sin middleware `role:` activo). Solo se quitó del `composer.json` — el `composer.lock` aún la tiene pinneada.

## Síntoma de la desincronización

```bash
composer validate
# → composer.lock is not up to date with the latest changes in composer.json
```

`composer install` seguirá funcionando (instala lo que dice el lock — incluido spatie), pero `composer validate` se queja.

## Cómo sincronizar

### Con Docker
```bash
docker compose exec api composer update spatie/laravel-permission --no-scripts
```

### Nativo
```bash
cd apps/api
composer update spatie/laravel-permission --no-scripts
```

Esto remueve `spatie/laravel-permission` del `composer.lock`. Verificar:

```bash
composer validate    # → composer.lock is up to date
grep "spatie/laravel-permission" composer.lock   # → (vacío)
```

## Limpieza extra opcional

Borrar la entrada cacheada del paquete (se regenera al siguiente `composer install`):

```bash
docker compose exec api composer dump-autoload
```

## Después

- Commit `composer.lock` actualizado en el mismo PR que removió el paquete del `composer.json`.
- `bootstrap/cache/packages.php` se regenera solo.
