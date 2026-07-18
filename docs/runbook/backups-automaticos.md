# Runbook — Backups automáticos de BD

> **Estado (2026-07-17, verificado en producción)**: el deploy del paquete F102 (`./scripts/deploy-api.sh`, commit `16d304d`) llevó `backup:run` a producción. Verificado por SSH (read-only) el 2026-07-17: el cron corre a diario y `storage/app/backups/` en el VPS real tiene backups consecutivos reales (`backup-2026-07-16_210008.sql.gz`, `backup-2026-07-17_210008.sql.gz`) — ya no es teórico, protege datos reales hoy.
> **Gap real encontrado en esta verificación**: `scripts/backup-mysql.sh` (offsite a B2) **nunca se subió al servidor** — no existe el archivo ahí, ni hay config de `rclone` (`~/.config/rclone/` no existe). Todo lo protegido hoy es **local-only**: si el VPS completo se pierde, se pierden la BD y sus backups juntos. La sección "Por qué v1 es solo local" de abajo describe esto como decisión intencional del owner — es correcto que sea la decisión, pero quede claro que implica **cero redundancia geográfica**, no solo "sin nube de terceros".
> **Decisión final (2026-07-16, ver ADR-015)**: el owner rechazó cualquier servicio de terceros/paga para este proyecto (misma decisión que descartó Pusher/Ably para realtime) — **backup local es la solución definitiva de v1, no un paso intermedio esperando credenciales de Backblaze B2**. `scripts/backup-mysql.sh` (con B2) queda documentado como referencia histórica, no como el plan a futuro.

## Qué existe hoy

1. **Comando** `apps/api/app/Console/Commands/BackupDatabaseCommand.php` — `php artisan backup:run --keep-days=14`. Genera `mysqldump --no-tablespaces --skip-routines --skip-triggers` (restricción real del usuario MySQL de Hostinger, sin `SUPER`/`RELOAD`), comprime con gzip, guarda en `storage/app/backups/` del VPS, purga backups más viejos que `--keep-days`. Password vía `MYSQL_PWD` env var, nunca en argv (no aparece en `ps aux`).
2. **Cron en hPanel** (uid `yK8eni9XE1`): diario 03:00 → `/bin/sh /home/u221820910/cron-scripts/clicktoeat-backup-run.sh`, que hace `cd` al app dir + corre el comando con el PHP 8.3 real de la cuenta (`/opt/alt/php83/usr/bin/php`) — mismo patrón exacto que los 3 crons de ClickToEat que ya funcionan (`clicktoeat-schedule-run.sh`, `clicktoeat-locales-purge.sh`, `clicktoeat-audit-purge.sh`).
3. **Alternativa más completa, ya escrita pero sin desplegar**: `scripts/backup-mysql.sh` + `scripts/backup-test.sh` (offsite a Backblaze B2 vía rclone, manifest sha256, restore drill mensual). Requiere credenciales reales de B2 que no existen todavía — ver "Pendiente".

## Por qué v1 es solo local (decisión 2026-07-16)

Configurar B2 requiere una cuenta Backblaze real + Application Key, que no se tenían al momento de esta sesión. Se decidió no bloquear la protección básica (backup local, que ya cubre "until borré algo por error") esperando esas credenciales. El script más completo (`scripts/backup-mysql.sh`) queda listo para activarse en cuanto existan.

## Pendiente para que esto proteja datos reales

1. ~~Desplegar el código a producción~~ **Hecho 2026-07-17** (`./scripts/deploy-api.sh`, commit `16d304d`).
2. ~~Verificar manualmente la primera corrida real~~ **Hecho 2026-07-17** — confirmado por SSH que hay dumps reales y crecientes en `storage/app/backups/`.
3. **Sigue pendiente, no se hizo esta sesión**: si se decide activar offsite pese a la decisión de "solo local": crear cuenta/bucket en Backblaze B2, instalar `rclone` en `~/bin/rclone` (binario standalone, sin `apt`), configurar el remote, crear `~/.config/clicktoeat-backup.env` con las credenciales, y subir `scripts/backup-mysql.sh` al servidor (hoy solo existe en el repo local, nunca se copió al VPS) — ver cabecera de ese script para el procedimiento completo.
4. **Sigue pendiente**: correr `scripts/backup-test.sh --local-only` para confirmar que el dump es restaurable (requiere una BD `_restoretest` pre-creada — el usuario MySQL de Hostinger no puede `CREATE DATABASE`). Nunca se ha corrido un restore drill real — los backups existen pero no está probado que efectivamente se puedan restaurar.

## Referencias

- [ADR-012 §7](../decisions/ADR-012-plan-499-operacion-de-salon-dine-in.md)
- [`setup-cron-scheduler.md`](setup-cron-scheduler.md) — por qué el campo "Comando" del cron debe ser un script `.sh`, nunca lógica de shell directa
- `scripts/README.md` — procedimiento completo de instalación de rclone + B2
