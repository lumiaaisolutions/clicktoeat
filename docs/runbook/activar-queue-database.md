# Activar queue:database en producción

Por defecto el sistema corre con `QUEUE_CONNECTION=sync` — los Jobs (newsletter,
emails, push) corren inline en el request HTTP. Esto está bien para volumen
bajo pero el endpoint del newsletter se vuelve lento con > 200 destinatarios
(timeout de PHP-FPM = 60s típicamente).

Esta guía describe cómo migrar a `queue:database` sin daemon (compatible con
Hostinger CageFS que no permite procesos persistentes).

## 1. Setear conexión en `.env` de producción

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 \
  "sed -i 's/^QUEUE_CONNECTION=.*/QUEUE_CONNECTION=database/' \
   ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env"
```

## 2. Crear tabla `jobs`

```bash
ssh ... 'cd ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html && \
   php artisan queue:table 2>/dev/null; \
   php artisan migrate --force'
```

## 3. Agregar cron en hPanel

hPanel → **Trabajos Cron** → Añadir:

| Campo     | Valor                                                                                            |
|-----------|--------------------------------------------------------------------------------------------------|
| Frecuencia| Cada 1 minuto (`* * * * *`)                                                                      |
| Comando   | `cd ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan queue:work --stop-when-empty --max-time=50 --tries=3 > /dev/null 2>&1` |

**Por qué `--stop-when-empty --max-time=50`**: Cada minuto el cron arranca el
worker, procesa todos los Jobs pendientes, y sale (no se queda como daemon).
`--max-time=50` evita que dos crons se solapen.

## 4. Verificar que procesa

Encolar un Job de prueba:

```bash
ssh ... 'cd ~/...public_html && php artisan tinker --execute="dispatch(function () { logger(\"queue test\"); });"'
```

Esperar 1-2 minutos y revisar el log:

```bash
ssh ... 'tail -20 ~/...public_html/storage/logs/laravel.log | grep "queue test"'
```

## Para revertir a sync

Volver a setear `QUEUE_CONNECTION=sync` en `.env`. El cron puede quedarse
(no procesará nada si la tabla está vacía).

## Cron adicional recomendado: purga de audit_logs

| Campo     | Valor                                                                                            |
|-----------|--------------------------------------------------------------------------------------------------|
| Frecuencia| Semanal, domingo 3am (`0 3 * * 0`)                                                              |
| Comando   | `cd ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan audit-logs:purge --days=365 > /dev/null 2>&1` |
