# Runbook — Setup del cron del Laravel Scheduler en Hostinger

> Hace falta **una sola entrada de cron** que dispara `php artisan schedule:run` cada minuto. Laravel decide internamente qué tareas correr a qué hora.

> ⚠️ **Corrección verificada 2026-07-06**: el comando de cron original
> recomendado en este runbook (`cd X && php artisan schedule:run >> log
> 2>&1` directo en el campo del cron de hPanel) **nunca funcionó** — el
> ejecutor de cron de esta cuenta de Hostinger no pasa el comando por una
> shell real, así que `cd`, `&&` y `>>` no se interpretan como se espera.
> El cron maestro de ClickToEat estuvo "configurado" (aparecía en la lista
> de Trabajos Cron) pero **nunca ejecutó nada** — ningún job del scheduler
> corrió jamás, incluyendo `trials:expire-manual`, con impacto real en
> producción. Ver
> [`postmortems/2026-07-06-trial-expiry-not-enforced.md`](postmortems/2026-07-06-trial-expiry-not-enforced.md)
> para el incidente completo. La sección "Configurar el cron en hPanel" de
> abajo ya tiene el procedimiento corregido y verificado — usarlo para
> cualquier cron nuevo en esta cuenta (no solo ClickToEat).

## Qué está agendado

Definido en `apps/api/bootstrap/app.php` → `withSchedule(...)`. Al 2026-07-06:

| Hora UTC | Frecuencia | Tarea | Por qué |
|----------|------------|-------|---------|
| 02:00 | Daily | Borra `idempotency_keys` con `expires_at < now()` | TTL del request |
| 02:10 | Daily | Borra `sessions` con `last_activity > 30 días` | Driver session=database crece sin TTL |
| 02:15 | Daily | Borra `cache` y `cache_locks` con `expiration < now` | Driver cache=database |
| 02:20 | Daily | `sanctum:prune-expired --hours=24` | Tokens expirados (cuando se introduzca expiración) |
| 02:25 | Daily | `queue:prune-failed --hours=2160` | Failed jobs > 90 días |
| 03:00 | Weekly (domingo) | Borra `audit_logs > 90 días` | SLA documentado en `data-inventory.md` |
| 03:10 | Weekly (domingo) | Borra `notificaciones` leídas > 90 días | Ruido en BD |
| 10:00 | Daily | Trial nudge emails (día 3/7/14/ending) | `TrialNudgeDispatcher::dispatchPending()` |
| 10:30 | Daily | `trials:expire-manual` | Cierra trials manuales vencidos |
| Cada 15 min | — | Carrito abandonado | `CarritoAbandonadoDispatcher::dispatchPending()` |
| 20:00 | Weekly (domingo) | Resumen semanal a owners | `ResumenSemanalDispatcher::dispatchAll()` |
| 09:30 | Daily | `gastos:check-recurrentes` | Aviso de gastos recurrentes vencidos |
| 11:00 | Daily | `locales:detect-orphan-stripe` | Red de seguridad — locales con Stripe activo sin owner |

Todas con `onOneServer()` para que sean idempotentes si en el futuro hay múltiples instancias.

## Configurar el cron en hPanel (procedimiento verificado 2026-07-06)

**No pongas lógica de shell (`cd`, `&&`, `>>`, comillas anidadas) directo en
el campo "Comando" del cron.** El ejecutor de Hostinger para esta cuenta no
la interpreta de forma confiable — se probaron 3 variantes distintas antes
de encontrar la que funciona:

1. `cd X && php artisan schedule:run >> log 2>&1` → error
   `timeout: failed to run command 'cd': No such file or directory`
   (intenta ejecutar `cd` como binario, sin shell).
2. `php /ruta/artisan schedule:run >> log 2>&1` (sin `cd`) → error
   `No arguments expected for "schedule:run" command, got ">>"` (sin shell,
   `>>` se pasa como argumento literal a Artisan).
3. `/bin/sh -c 'cd X && php ... >> log 2>&1'` → error `cd: too many
   arguments` (la capa de API de Hostinger no preserva bien el quoting
   anidado de una cadena larga).

**Lo que funciona**: mover toda la lógica a un script `.sh` en el servidor
y que el campo "Comando" del cron sea solo la ruta al script — sin `&&`,
sin `>>`, sin comillas.

1. Crear el script en el servidor (una vez, por SSH):
   ```bash
   ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
   mkdir -p ~/cron-scripts
   cat > ~/cron-scripts/clicktoeat-schedule-run.sh <<'EOF'
   #!/bin/sh
   cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
   /opt/alt/php83/usr/bin/php artisan schedule:run >> storage/logs/cron.log 2>&1
   EOF
   chmod +x ~/cron-scripts/clicktoeat-schedule-run.sh
   ```
   Usar la ruta absoluta del PHP de la cuenta (`/opt/alt/php83/usr/bin/php`
   en esta cuenta — confirmar con `which php` por SSH si se replica en otra
   cuenta) en vez de `php` a secas, por la misma razón: el PATH del
   ejecutor de cron puede no incluirlo.

2. Entrar a https://hpanel.hostinger.com
3. **Avanzado** → **Trabajos Cron** → **Crear un nuevo trabajo cron**
4. Configuración:

   | Campo | Valor |
   |-------|-------|
   | Comando | `/bin/sh /home/u221820910/cron-scripts/clicktoeat-schedule-run.sh` |
   | Minuto | `*` (cada minuto) |
   | Hora   | `*` |
   | Día del mes | `*` |
   | Mes    | `*` |
   | Día de la semana | `*` |

   En notación cron pura: `* * * * *`

5. **Guardar**

> El "una entrada cada minuto" es **correcto y estándar** — `schedule:run` es lightning fast (< 100 ms en idle), no genera carga visible.

**Este mismo patrón (script `.sh` + comando de cron sin `&&`/`>>`) aplica a
cualquier cron de esta cuenta**, no solo `schedule:run` — los crons directos
`audit-logs:purge` y `locales:purge` tenían el mismo bug y se corrigieron
igual (`~/cron-scripts/clicktoeat-audit-purge.sh`,
`~/cron-scripts/clicktoeat-locales-purge.sh`).

> **Nota para otros proyectos en la misma cuenta Hostinger** (ClickToDo,
> ClickToBarber, ClickToShop): sus crons de `schedule:run` usan el patrón
> viejo (`cd X && php artisan schedule:run >> log`) sin verificar. No se
> revisaron el 2026-07-06 (fuera de alcance de esa sesión) — si sufren el
> mismo bug, aplicar este mismo procedimiento.

## Verificación post-deploy

**No basta con ver el cron en la lista de hPanel** — eso solo confirma que
existe, no que ejecuta nada (fue exactamente el error del 2026-07-06).
Verificar que el log realmente crece:

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cat ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html/storage/logs/cron.log
# Debe crecer con líneas "No scheduled commands are ready to run." cada minuto
```

Si el archivo ni siquiera existe después de varios minutos, el comando del
cron no está ejecutando nada — revisar el output real vía la API de
Hostinger (`hosting_getCronJobOutputV1`, uid del cron) antes de asumir que
"ya está bien" solo porque aparece en la lista.

Para forzar una corrida específica manualmente (debug):

```bash
ssh ... 'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:test'
```

Lista las tareas agendadas:

```bash
ssh ... 'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:list'
```

## Cuándo agregar tareas nuevas

Editar `apps/api/bootstrap/app.php` dentro del `withSchedule(...)`. NO crear `app/Console/Kernel.php` (Laravel 11 lo dejó atrás).

Patrón:

```php
$schedule->command('artisan:command --args')
    ->dailyAt('04:00')           // o ->everyMinute(), ->everyFifteenMinutes(), ->weeklyOn(0, '03:00'), etc.
    ->name('mi-tarea')           // para que aparezca en `schedule:list`
    ->onOneServer()              // sólo una vez aunque haya N instancias
    ->withoutOverlapping();      // no correr si la anterior aún no terminó
```

Para callbacks inline (`$schedule->call(fn () => ...)`), igual.

## Si falla

| Síntoma | Causa probable |
|---------|----------------|
| Log vacío después de 5 min | El cron no se creó bien en hPanel — verificar |
| `command not found: php` | El PATH del cron de Hostinger no incluye PHP — usar ruta absoluta: `/usr/bin/php` o la que muestre `which php` por SSH |
| `script error: ENVIRONMENT_NOT_SET` | El cron no carga `.env` — Laravel lo carga solo, pero verificar que el cron entra en el directorio correcto con `cd` antes de `php artisan` |
| Tarea no se ejecuta a su hora | La zona horaria del servidor puede diferir. Forzar TZ en el schedule: `->timezone('America/Mexico_City')` |

## Costo operativo

- Cada `schedule:run` consume ~100 ms de CPU + 1 query (`SELECT migrations`).
- 60 runs/h × 24 = 1440/día → ~2.4 min total de CPU diario.
- Bajo todos los plans de Hostinger Business → invisible.

## Eliminar el cron

Si por alguna razón hay que apagar el scheduler:

- **hPanel** → Avanzado → Trabajos Cron → Eliminar.

Las tareas agendadas no corren, pero **el código sigue ahí** — si vuelves a poner el cron, todo arranca solo.
