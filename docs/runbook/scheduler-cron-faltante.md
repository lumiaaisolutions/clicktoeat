# Incidente/Runbook — El scheduler de Laravel NO corre en prod (ClickToEat + ClickToShop)

> Detectado 2026-09-07 auditando "el bug de cron de los repos hermanos". El
> hallazgo fue el inverso al esperado: **los hermanos (`clicktobarber`,
> `clicktodo`) SÍ tienen su `schedule:run`; ClickToEat y ClickToShop NO.**

## Qué pasa

El crontab del usuario `deploy` en el VPS tiene `schedule:run` cada minuto para
`clicktobarber-api` y `clicktodo-api`, pero **no existe ninguna línea de
`schedule:run` para `clicktoeat` ni `clicktoshop`**. No hay systemd timer
alternativo ni `storage/logs/schedule.log` → el scheduler de esos dos productos
**nunca ha corrido en producción**.

(El backup MySQL sí corre — tiene su propia línea de cron dedicada a las 03:00 /
03:15 UTC. Lo que falta es el *scheduler de la app*.)

## Impacto

Tareas de `bootstrap/app.php → withSchedule(...)` que no se ejecutan:

**Ambos:**
- `prune-idempotency-keys`, `prune-sessions`, `prune-cache`, `prune-sanctum`,
  `prune-failed-jobs`, `prune-audit-logs`, `prune-notifications` → **tablas
  crecen sin control** (bloat de BD con el tiempo).
- `trials:expire-manual` → no cierra trials manuales vencidos. **Mitigado** por
  `Local::hasActivePlan()` que compara `trial_ends_at` en tiempo real (el
  bloqueo de negocio funciona igual), pero `plan_status` queda desactualizado.
- `trial-nudge-emails` → no se mandan (además el SMTP está caído, ver
  [`configurar-smtp-prod.md`](./configurar-smtp-prod.md)).
- `carrito-abandonado` (cada 15 min) → no dispara recuperación de carritos.

**Solo ClickToShop:**
- `clicktoshop:restock-forecast` (diario 8:30) → la predicción de
  reabastecimiento por IA no genera nada.
- Pruning de `FunnelEvent`.

## Fix

Agregar dos líneas al crontab de `deploy` (mismo formato exacto que ya usan
barber/todo). **NO tocar las líneas de `lumia-hq-cron.sh`, backups, inmath ni
tcvisionwear.** Append seguro (respeta todo lo existente), con backup previo:

```bash
ssh -p 8080 deploy@2.24.123.93
# 1) Backup del crontab actual
crontab -l > ~/crontab.backup.$(date +%Y%m%d).txt
# 2) Append de las dos líneas (no reescribe las demás)
( crontab -l; \
  echo '* * * * * cd /var/www/clicktoeat/api  && php8.4 artisan schedule:run >> /var/www/clicktoeat/api/storage/logs/schedule.log 2>&1'; \
  echo '* * * * * cd /var/www/clicktoshop/api && php8.4 artisan schedule:run >> /var/www/clicktoshop/api/storage/logs/schedule.log 2>&1' \
) | crontab -
# 3) Verificar (deben seguir TODAS las líneas previas + las 2 nuevas)
crontab -l | grep schedule:run
```

Verificación a los ~2 min: `tail /var/www/clicktoeat/api/storage/logs/schedule.log`
debe mostrar corridas. Rollback: `crontab ~/crontab.backup.YYYYMMDD.txt`.

> **Por qué se documenta en vez de aplicarse solo:** el crontab es un recurso
> **compartido** con otros productos LUMIA en el mismo VPS; por regla del
> proyecto (CLAUDE.md) toda acción a nivel sistema que no sea exclusiva se
> confirma con el dueño antes de ejecutarla. El append de arriba es aditivo y
> reversible.

## Nota de diseño

`onOneServer()` en las tareas requiere un cache lock compartido; con un solo
servidor no hay problema. Si algún día se escala a multi-nodo, el `schedule:run`
debe correr en todos los nodos y `onOneServer()` evita duplicados.
