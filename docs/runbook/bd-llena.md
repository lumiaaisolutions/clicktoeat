# Runbook — MySQL con disco lleno

## Síntomas

- API responde **500** con `SQLSTATE[HY000] [1021] Disk full`.
- `INSERT` / `UPDATE` fallan; `SELECT` puede seguir funcionando.
- En logs Laravel: `Database error` o `connection timeout`.
- Pedidos públicos rebotan en `POST /public/pedidos/{slug}` → cliente pierde la venta.

## Severidad

🔴 **Crítica.** Cada minuto se pierden pedidos.

## Diagnóstico inmediato (< 5 min)

### 1. Confirmar que es disk full (no otra cosa)

```bash
# Si está en Docker
docker compose exec mysql df -h /var/lib/mysql

# En el host (si MySQL es servicio del SO)
df -h /var/lib/mysql

# En un cloud DB (RDS/CloudSQL): ir a la consola del proveedor, métrica FreeStorageSpace
```

`Use% > 95%` → confirmado.

### 2. Identificar qué ocupa

```sql
-- Conectarse como root
SELECT
    table_schema AS db,
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
ORDER BY (data_length + index_length) DESC
LIMIT 20;
```

Sospechosos habituales en ClickToEat:
- `sessions` — driver `session=database`.
- `cache` — driver `cache=database`.
- `jobs` / `failed_jobs` — cuando se introduzcan jobs.
- `personal_access_tokens` — tokens nunca expiran (ver issues).
- `movimientos_inventario` — crece sin límite, pero es estructural.
- `pedidos` + `detalle_pedidos` — idem.

## Liberación rápida (orden recomendado)

### Paso 1 — Trim de tablas "ruido" (seguro, no toca datos del negocio)

```sql
-- Sesiones más viejas de 30 días
DELETE FROM sessions WHERE last_activity < UNIX_TIMESTAMP(NOW() - INTERVAL 30 DAY);

-- Cache expirado
DELETE FROM cache       WHERE expiration < UNIX_TIMESTAMP(NOW());
DELETE FROM cache_locks WHERE expiration < UNIX_TIMESTAMP(NOW());

-- Failed jobs (revisar antes que no haya que reprocessar)
DELETE FROM failed_jobs WHERE failed_at < NOW() - INTERVAL 30 DAY;
```

### Paso 2 — Tokens Sanctum nunca usados o muy viejos

```sql
-- Tokens nunca usados creados hace más de 90 días
DELETE FROM personal_access_tokens
WHERE last_used_at IS NULL
  AND created_at < NOW() - INTERVAL 90 DAY;
```

### Paso 3 — Compactar tablas (devuelve espacio al filesystem)

InnoDB no libera espacio físico tras `DELETE` salvo `OPTIMIZE TABLE`:

```sql
OPTIMIZE TABLE sessions, cache, cache_locks, failed_jobs, personal_access_tokens;
```

⚠️ Toma lock — hacerlo fuera de horario pico o con `ALTER TABLE ... ENGINE=InnoDB` que es online en MySQL 5.6+.

### Paso 4 — Si sigue corto: archivar/borrar pedidos viejos

❗ Acción destructiva. Requiere aprobación del responsable.

```sql
-- Cuántos pedidos muy viejos hay (más de 2 años)
SELECT COUNT(*) FROM pedidos
WHERE created_at < NOW() - INTERVAL 2 YEAR;

-- Si decisión es archivar, dumpear primero antes de borrar
-- (ver runbook restaurar-backup-mysql.md para formato)

-- Soft-delete masivo (recuperable):
UPDATE pedidos SET deleted_at = NOW()
WHERE created_at < NOW() - INTERVAL 2 YEAR
  AND deleted_at IS NULL;
```

Hard-delete sólo después de exportar a un cold storage (S3 Glacier, p.ej.).

### Paso 5 — Escalar disco

Si los pasos anteriores no bastan, **escalar el storage del proveedor**:

- AWS RDS: `modify-db-instance --allocated-storage <N>`.
- DigitalOcean Managed DB: panel → resize.
- Self-hosted Docker: parar contenedor, ampliar volumen del host, restart.

Esto suele tener downtime de minutos. **Mejor hacerlo proactivamente** (alertas a 70%) que cuando ya está lleno.

## Validación post-fix

```bash
# Disco con headroom
df -h /var/lib/mysql       # debe estar < 80%

# MySQL respondiendo
docker compose exec mysql mysqladmin -u root -proot ping
# → mysqld is alive

# API recibiendo pedidos
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner+tacos-el-gordo@ClickToEat.app","password":"password123"}'
# → 200 con token
```

## Prevención

### Alertas

Configurar antes de que duela:

- **70% disk** → warning.
- **85% disk** → critical, page on-call.
- **95% disk** → escalar inmediato.

Proveedores: CloudWatch Alarm (RDS), DO Monitoring, Grafana + node_exporter (self-hosted).

### Cron de mantenimiento semanal

Agendar (`app/Console/Kernel.php` cuando se introduzca):

```php
// Limpieza semanal de ruido
$schedule->call(function () {
    DB::table('sessions')->where('last_activity', '<', now()->subDays(30)->timestamp)->delete();
    DB::table('cache')->where('expiration', '<', now()->timestamp)->delete();
    DB::table('failed_jobs')->where('failed_at', '<', now()->subDays(30))->delete();
})->weekly();
```

Más limpieza periódica de tokens:

```php
$schedule->command('sanctum:prune-expired --hours=24')->daily();
```

### Cambiar drivers que crecen sin límite

- `SESSION_DRIVER=redis` (en lugar de `database`) → expira por TTL.
- `CACHE_STORE=redis`.
- `QUEUE_CONNECTION=redis` cuando se introduzcan jobs.

Requiere Redis en stack. Documentar en deploy. Ver [`issues/devops-faltante.md`](../issues/devops-faltante.md).

## Postmortem

Documentar **siempre** después de un incidente de este tipo:

- Qué tabla creció.
- Por qué se le acabó el disco (¿alertas que no dispararon? ¿escalado proactivo no se hizo?).
- Acción correctiva (nuevas alertas, mover a Redis, etc.).
- Tiempo de detección y tiempo de recuperación.

Plantilla de postmortem (cuando se cree): `docs/runbook/postmortems/YYYY-MM-DD-<incidente>.md`.
