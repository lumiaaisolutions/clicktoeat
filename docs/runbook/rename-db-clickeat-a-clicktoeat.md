# Runbook — Renombrar BD `clickeat` → `clicktoeat`

> Histórico: el repo tenía inconsistencia entre `clickeat` (Docker) y `clicktoeat` (nativo). Se estandarizó en `clicktoeat`. Aplica este runbook **solo si** tu volumen Docker actual tiene la BD vieja `clickeat`.

## Detectar si te afecta

Si nunca corriste `docker compose up` con la versión vieja, **no te afecta** — la próxima vez Docker creará `clicktoeat` directamente.

Verificar tu volumen actual:
```bash
docker compose exec mysql mysql -u root -proot -e "SHOW DATABASES;"
```

Si ves `clickeat` → aplica este runbook. Si sólo ves `clicktoeat`, ya está.

## Opción A — Re-migrar desde cero (la más simple)

Pierdes los datos del entorno Docker, pero los seeders los recuperan.

```bash
docker compose down -v          # ⚠️ borra volumen mysql_data
docker compose up -d --build
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan storage:link
```

## Opción B — Renombrar in-place (preserva datos)

MySQL no tiene `RENAME DATABASE`. El truco: crear la nueva, mover tablas una por una.

```bash
docker compose exec mysql bash -lc '
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS clicktoeat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
for tbl in $(mysql -u root -proot -N -e "SHOW TABLES" clickeat); do
  mysql -u root -proot -e "RENAME TABLE clickeat.$tbl TO clicktoeat.$tbl"
done
mysql -u root -proot -e "GRANT ALL PRIVILEGES ON clicktoeat.* TO '\''clicktoeat'\''@'\''%'\''; FLUSH PRIVILEGES;"
'
```

Después:
```bash
docker compose restart api
```

## Opción C — Sólo cambiar el alias y conservar `clickeat`

Si por alguna razón no quieres tocar la BD vieja, puedes hacer que el contenedor `api` siga apuntando al nombre `clickeat` poniendo en `apps/api/.env`:

```env
DB_DATABASE=clickeat
DB_USERNAME=clickeat
DB_PASSWORD=clickeat
```

`apps/api/.env` está en `.gitignore` — sobrescribe los defaults del compose. **No recomendado** porque vuelve a meter la inconsistencia.

## Si corres en producción

- Esta migración ocurrió en dev. Producción debería estar usando el nombre que tenga su propia configuración (probablemente algo diferente a "clickeat"/"clicktoeat" — confirmar con quien hizo el deploy).
- Si por casualidad tu prod sí está en `clickeat`, **no** corras esto sin backup completo.

## Verificación

```bash
docker compose exec api php artisan migrate:status     # debe listar las migraciones aplicadas
docker compose exec api php artisan tinker
>>> App\Models\Local::count()                          # debe coincidir con los datos previos
```
