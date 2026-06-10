# Runbook — Restaurar backup de MySQL

> Procedimiento para restaurar la base `clicktoeat` desde un dump SQL. Aplica para corrupción, borrado accidental, rollback post-deploy fallido, o "vuelta atrás" tras pruebas en staging.

## Severidad y bloqueos

- **Implica DOWNTIME** de la API mientras se restaura (minutos a horas según el tamaño).
- **Destructivo**: sobrescribe el estado actual. Si hay pedidos hechos después del backup, se pierden.
- Requiere **aprobación explícita** del responsable de operación antes de ejecutar en producción.

## Pre-requisitos

1. **Backup disponible** y verificado:
   - Off-site (S3/Backblaze/etc.) o local.
   - Formato: `mysqldump --single-transaction` (`.sql` o `.sql.gz`).
   - Verificación de checksum SHA-256 contra el manifiesto del backup.
2. **Ventana de mantenimiento** acordada con el equipo.
3. **Snapshot de seguridad del estado actual** antes de tocar nada (por si el restore falla y hay que volver al pre-restore):
   ```bash
   mysqldump -u root -p<root_pass> --single-transaction --routines --triggers clicktoeat \
     | gzip > /tmp/pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz
   ```
4. **Notificar** al equipo: anuncio en el canal de operaciones + timer de cuánto tiempo se espera el downtime.

## Procedimiento

### 1. Modo mantenimiento

```bash
docker compose exec api php artisan down \
  --message="Mantenimiento programado — vuelve en 30 min" \
  --retry=120
```

Cliente público y panel admin reciben 503 con `Retry-After`. La landing sigue inaccesible pero con mensaje claro.

### 2. Snapshot del estado actual (defensa en profundidad)

Aunque ya hayas hecho backup automático esta mañana, **toma un snapshot ahora** del estado vivo antes de sobrescribir. Si el restore sale mal, esto es tu reverso.

```bash
docker compose exec mysql sh -c '
  mysqldump -u root -proot --single-transaction --routines --triggers clicktoeat
' | gzip > /tmp/pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz

ls -lh /tmp/pre-restore-*.sql.gz
```

### 3. Confirmar identidad del backup a restaurar

```bash
# Si está en S3
aws s3 ls s3://<bucket>/backups/clicktoeat/

# Validar checksum del archivo descargado
sha256sum backup-2026-06-09.sql.gz
# Comparar contra el manifest que guardó el job de backup
```

### 4. Descomprimir y restaurar

```bash
# Si el archivo está comprimido
gunzip -k backup-2026-06-09.sql.gz   # deja el .sql descomprimido

# Restore
docker compose exec -T mysql mysql -u root -proot clicktoeat < backup-2026-06-09.sql

# Si está comprimido y quieres restaurar streaming
gunzip -c backup-2026-06-09.sql.gz \
  | docker compose exec -T mysql mysql -u root -proot clicktoeat
```

Para bases grandes (> 1 GB), considerar:
- Usar `--quick` y `--single-transaction` en el dump original.
- Restaurar con `pv` para ver progreso: `pv backup.sql | mysql ...`.
- Desactivar índices temporalmente para acelerar: `SET autocommit=0; SET unique_checks=0; SET foreign_key_checks=0;` antes del load, restaurar al final.

### 5. Aplicar migraciones nuevas (si el backup es de versión anterior del schema)

```bash
docker compose exec api php artisan migrate --force
```

⚠️ `--force` necesario porque está en modo producción. **Solo correr si el backup era de un schema anterior al actual.** Si el backup es del mismo HEAD, no hace falta.

### 6. Validación post-restore

```bash
# A. Conteos cuadran con lo esperado del backup
docker compose exec mysql mysql -u root -proot clicktoeat -e "
  SELECT 'locales'      AS tabla, COUNT(*) FROM locales
  UNION ALL SELECT 'users',       COUNT(*) FROM users
  UNION ALL SELECT 'productos',   COUNT(*) FROM productos
  UNION ALL SELECT 'pedidos',     COUNT(*) FROM pedidos
  UNION ALL SELECT 'ingredientes',COUNT(*) FROM ingredientes
  UNION ALL SELECT 'movimientos_inventario', COUNT(*) FROM movimientos_inventario;
"

# B. Integrity check de InnoDB
docker compose exec mysql mysqlcheck -u root -proot --all-databases --check

# C. Endpoint público responde
curl -s http://localhost:8080/api/v1/public/menu/tacos-el-gordo | jq '.data.local.nombre'

# D. Login funciona
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner+tacos-el-gordo@ClickToEat.app","password":"password123"}' | jq '.user'
```

### 7. Sacar de modo mantenimiento

```bash
docker compose exec api php artisan up
```

### 8. Verificación funcional (manual o automatizada)

- Login admin → ver pedidos → crear pedido demo desde landing pública → confirmar que aparece.
- Si tienes una suite de smoke tests, correrla.

### 9. Notificar fin del mantenimiento

Mensaje al canal de operaciones con:
- Tiempo total de downtime.
- Restore exitoso / con incidentes.
- Acción correctiva si algo no quedó al 100%.

## Si el restore falla

### A. El dump no se aplica (errores SQL durante import)

Causas comunes:
- Charset mismatch (`utf8` vs `utf8mb4`). Forzar `--default-character-set=utf8mb4` en el comando mysql.
- Triggers o stored procs duplicados. Importar con `--force` para continuar.
- Foreign keys (importar con `SET FOREIGN_KEY_CHECKS=0;` antes).

Si no se puede recuperar:
1. Restore desde el snapshot de defensa (paso 2):
   ```bash
   gunzip -c /tmp/pre-restore-*.sql.gz \
     | docker compose exec -T mysql mysql -u root -proot clicktoeat
   ```
2. Salir de mantenimiento.
3. Postmortem inmediato.

### B. El restore se aplicó pero el sistema está roto

- Validar `SHOW TABLES;` — todas presentes.
- `php artisan migrate:status` — esperado.
- Si BD restaurada es de versión más vieja, faltan migraciones nuevas → correr `php artisan migrate --force`.

## Restore parcial (recuperar una tabla sin tocar el resto)

Útil si alguien borró `pedidos` por error pero el resto está sano.

```bash
# 1. Extraer sólo la tabla del dump
sed -n '/^-- Table structure for table `pedidos`/,/^-- Table structure for table/p' backup.sql > pedidos-only.sql

# 2. Restaurarla
docker compose exec -T mysql mysql -u root -proot clicktoeat < pedidos-only.sql
```

⚠️ **Riesgo con FKs**: si `pedidos` tiene FKs hacia tablas con cambios desde el backup, puede haber conflictos. Validar con `mysqlcheck`.

## Restore drill periódico (recomendado)

Para verificar que los backups realmente sirven, **mensualmente**:

1. Levantar un MySQL aparte (otro container).
2. Restaurar el backup más reciente ahí.
3. Correr validaciones.
4. Descartar.

Si el drill falla → arreglar pipeline de backup antes de que pase en serio.

Hoy esto no está automatizado. Documentado como pendiente en [`backup-mysql-automatizado.md`](backup-mysql-automatizado.md).

## Referencias

- [`backup-mysql-automatizado.md`](backup-mysql-automatizado.md) — política y diseño del backup.
- [`bd-llena.md`](bd-llena.md) — qué hacer si en lugar de restore necesitas liberar espacio.
- Documentación oficial: <https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html>
