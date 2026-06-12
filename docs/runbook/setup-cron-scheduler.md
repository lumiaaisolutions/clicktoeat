# Runbook — Setup del cron del Laravel Scheduler en Hostinger

> Hace falta **una sola entrada de cron** que dispara `php artisan schedule:run` cada minuto. Laravel decide internamente qué tareas correr a qué hora.

## Qué está agendado

Definido en `apps/api/bootstrap/app.php` → `withSchedule(...)`. Al 2026-06-10:

| Hora UTC | Frecuencia | Tarea | Por qué |
|----------|------------|-------|---------|
| 02:00 | Daily | Borra `idempotency_keys` con `expires_at < now()` | TTL del request |
| 02:10 | Daily | Borra `sessions` con `last_activity > 30 días` | Driver session=database crece sin TTL |
| 02:15 | Daily | Borra `cache` y `cache_locks` con `expiration < now` | Driver cache=database |
| 02:20 | Daily | `sanctum:prune-expired --hours=24` | Tokens expirados (cuando se introduzca expiración) |
| 02:25 | Daily | `queue:prune-failed --hours=2160` | Failed jobs > 90 días |
| 03:00 | Weekly (domingo) | Borra `audit_logs > 90 días` | SLA documentado en `data-inventory.md` |
| 03:10 | Weekly (domingo) | Borra `notificaciones` leídas > 90 días | Ruido en BD |

Todas con `onOneServer()` para que sean idempotentes si en el futuro hay múltiples instancias.

## Configurar el cron en hPanel

1. Entrar a https://hpanel.hostinger.com
2. **Avanzado** → **Trabajos Cron** → **Crear un nuevo trabajo cron**
3. Configuración:

   | Campo | Valor |
   |-------|-------|
   | Comando | `cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> /home/u221820910/logs/scheduler.log 2>&1` |
   | Minuto | `*` (cada minuto) |
   | Hora   | `*` |
   | Día del mes | `*` |
   | Mes    | `*` |
   | Día de la semana | `*` |

   En notación cron pura: `* * * * *`

4. **Guardar**

> El "una entrada cada minuto" es **correcto y estándar** — `schedule:run` es lightning fast (< 100 ms en idle), no genera carga visible.

## Verificación post-deploy

Esperar 5 minutos. Después:

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cat ~/logs/scheduler.log
# Debe ver salida cada 1 min sin errores
```

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
