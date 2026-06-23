# Runbook — Cron: gastos recurrentes

> Notifica al owner cuando un gasto marcado como `recurrente=true` lleva
> más de 35 días sin nuevo registro (ej. la renta de junio que no se ha
> capturado).

## Comando

```bash
php artisan gastos:check-recurrentes
```

## Programación (Laravel scheduler)

Definido en `bootstrap/app.php` → `withSchedule()`:

```php
$schedule->command('gastos:check-recurrentes')
    ->daily()->at('09:30')
    ->name('gastos-check-recurrentes')
    ->onOneServer();
```

## Cron de hPanel (ya existe, no se duplica)

El **único** cron necesario en Hostinger es el del scheduler de Laravel.
Si ya está agregado (lo está, junto con los demás `$schedule->...` de
`bootstrap/app.php`), no hay que tocar nada.

```cron
* * * * * cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

(Configurado en hPanel → *Trabajos Cron*, cada minuto. Laravel decide
internamente qué corre y qué no.)

## Verificar manualmente en prod

```bash
ssh ... 'cd /home/.../public_html && php artisan gastos:check-recurrentes'
# Output esperado: "Notificaciones creadas: N"
```

## Idempotencia

- Si ya existe una notificación tipo `gasto_recurrente_pendiente` con el
  mismo `titulo` en los últimos 7 días para el mismo local, no se crea
  una nueva.
- Por lo tanto el cron se puede ejecutar a mano múltiples veces sin
  generar duplicados.

## Lógica

1. Agrupa todos los gastos `recurrente=true` por `(local_id, categoria, concepto)`.
2. Toma la fecha más reciente de cada grupo.
3. Si esa fecha es > 35 días atrás → crea `Notificacion` para el local.

## Cómo desactivar temporalmente

Si por algún motivo se quiere pausar (ej. spam de notificaciones tras
seedear datos viejos):

1. Comentar la línea `gastos:check-recurrentes` en `bootstrap/app.php`.
2. Desplegar (`./scripts/deploy-api.sh`).

## Cómo cambiar el threshold

El umbral está hardcoded como `THRESHOLD_DAYS = 35` en
`app/Console/Commands/CheckGastosRecurrentesCommand.php`. Si se decide
hacer configurable (env var o setting por local), agregar getter +
documentar aquí.

## Cómo el owner ve la notificación

Se renderea en el bell del panel (`/admin`) como cualquier otra
notificación. Click → redirige a `/admin/gastos` (vía `data.url_destino`)
para que el owner registre el gasto pendiente.
