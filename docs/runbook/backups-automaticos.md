# Runbook — Backups automáticos de BD

> **Estado (2026-07-16)**: cron creado en hPanel, apuntando a un comando (`backup:run`) que todavía **no está desplegado** a producción — ver "Pendiente" abajo antes de asumir que ya protege datos reales.
> **Decisión final (2026-07-16, ver ADR-015)**: el owner rechazó cualquier servicio de terceros/paga para este proyecto (misma decisión que descartó Pusher/Ably para realtime) — **backup local es la solución definitiva de v1, no un paso intermedio esperando credenciales de Backblaze B2**. `scripts/backup-mysql.sh` (con B2) queda documentado como referencia histórica, no como el plan a futuro.

## Qué existe hoy

1. **Comando** `apps/api/app/Console/Commands/BackupDatabaseCommand.php` — `php artisan backup:run --keep-days=14`. Genera `mysqldump --no-tablespaces --skip-routines --skip-triggers` (restricción real del usuario MySQL de Hostinger, sin `SUPER`/`RELOAD`), comprime con gzip, guarda en `storage/app/backups/` del VPS, purga backups más viejos que `--keep-days`. Password vía `MYSQL_PWD` env var, nunca en argv (no aparece en `ps aux`).
2. **Cron en hPanel** (uid `yK8eni9XE1`): diario 03:00 → `/bin/sh /home/u221820910/cron-scripts/clicktoeat-backup-run.sh`, que hace `cd` al app dir + corre el comando con el PHP 8.3 real de la cuenta (`/opt/alt/php83/usr/bin/php`) — mismo patrón exacto que los 3 crons de ClickToEat que ya funcionan (`clicktoeat-schedule-run.sh`, `clicktoeat-locales-purge.sh`, `clicktoeat-audit-purge.sh`).
3. **Alternativa más completa, ya escrita pero sin desplegar**: `scripts/backup-mysql.sh` + `scripts/backup-test.sh` (offsite a Backblaze B2 vía rclone, manifest sha256, restore drill mensual). Requiere credenciales reales de B2 que no existen todavía — ver "Pendiente".

## Por qué v1 es solo local (decisión 2026-07-16)

Configurar B2 requiere una cuenta Backblaze real + Application Key, que no se tenían al momento de esta sesión. Se decidió no bloquear la protección básica (backup local, que ya cubre "until borré algo por error") esperando esas credenciales. El script más completo (`scripts/backup-mysql.sh`) queda listo para activarse en cuanto existan.

## Pendiente para que esto proteja datos reales

1. **Desplegar** el código de esta sesión a producción (`./scripts/deploy-api.sh`) — el cron ya está corriendo pero hoy falla silenciosamente (`> /dev/null 2>&1`) porque `backup:run` no existe todavía en el servidor. **No se hizo en esta sesión** — desplegar significa llevar a producción TODO lo construido en el paquete de operación de salón (Etapas A-D), una decisión aparte que no se tomó aquí.
2. Verificar manualmente la primera corrida real después del deploy (`ssh` + correr `php artisan backup:run` a mano una vez, confirmar que el archivo aparece en `storage/app/backups/`).
3. Si se decide activar offsite: crear cuenta/bucket en Backblaze B2, instalar `rclone` en `~/bin/rclone` (binario standalone, sin `apt`), configurar el remote, crear `~/.config/clicktoeat-backup.env` con las credenciales, y usar `scripts/backup-mysql.sh` en vez de (o además de) `backup:run` — ver cabecera de ese script para el procedimiento completo.
4. Mensual: `scripts/backup-test.sh --local-only` para confirmar que el dump es restaurable (requiere una BD `_restoretest` pre-creada — el usuario MySQL de Hostinger no puede `CREATE DATABASE`).

## Referencias

- [ADR-012 §7](../decisions/ADR-012-plan-499-operacion-de-salon-dine-in.md)
- [`setup-cron-scheduler.md`](setup-cron-scheduler.md) — por qué el campo "Comando" del cron debe ser un script `.sh`, nunca lógica de shell directa
- `scripts/README.md` — procedimiento completo de instalación de rclone + B2
