# Runbook — Crash de php-fpm

## Síntomas

- nginx responde **502 Bad Gateway** consistente o intermitente.
- Health endpoint `/up` no responde o responde no-200.
- En logs nginx: `connect() failed (111: Connection refused)` o `upstream prematurely closed connection`.
- En logs Laravel (`storage/logs/laravel.log`) puede haber un stacktrace fatal previo al crash.
- En logs PHP (`storage/logs/php.log` en este proyecto) puede haber `PHP Fatal error: ...`.

## Severidad

🔴 **Crítica.** API completamente fuera. Tanto landing pública como panel admin.

## Triage rápido (< 2 min)

### 1. ¿php-fpm está vivo?

```bash
# Docker
docker compose ps api
# Si dice "Exited" o "Restarting" → confirma crash

# Self-hosted
systemctl status php8.3-fpm
# o
ps aux | grep php-fpm
```

### 2. ¿nginx puede llegar a él?

```bash
docker compose exec nginx sh -c 'getent hosts api'
# Debe resolver. Si no, problema de red Docker.
```

### 3. Tail de logs en paralelo

```bash
# Tres terminales:
docker compose logs -f --tail=100 api
docker compose logs -f --tail=100 nginx
docker compose exec api tail -f storage/logs/laravel.log
```

## Recuperación inmediata

### Plan A — Restart simple

```bash
docker compose restart api
# Wait 5-10s
curl -sf http://localhost:8080/up && echo "OK" || echo "STILL DOWN"
```

Si vuelve → seguir al **postmortem** (no dar por cerrado el incidente; un crash sin causa identificada va a repetirse).

### Plan B — Restart cascadeado si nginx también está degradado

```bash
docker compose restart api nginx
```

### Plan C — Rollback de release

Si el crash empezó tras un deploy reciente:

```bash
# Identificar la imagen anterior
docker compose images api
# Buscar el tag previo
git log --oneline -10

# Rollback (depende de cómo se haga el deploy)
git checkout <commit-anterior>
docker compose up -d --build api
```

En setups con orquestador (Kubernetes / Fly / ECS):
- `kubectl rollout undo deployment/api`
- `fly releases list` → `fly deploy --image <imagen-vieja>`

### Plan D — Modo mantenimiento mientras se diagnostica

```bash
docker compose exec api php artisan down --message="Mantenimiento" --retry=60
```

API responderá 503 con `Retry-After: 60` en lugar de 502 crash. La landing pública queda inaccesible (decisión consciente — mejor mensaje claro que error random).

Para sacarlo:
```bash
docker compose exec api php artisan up
```

## Causas comunes y su solución

### 1. Memory limit excedido

**Síntoma:** `PHP Fatal error: Allowed memory size of X bytes exhausted`.

**Causa:** una request hizo `Model::all()` sin paginar, o un job procesa una colección enorme en memoria.

**Fix corto:**
```ini
; docker/php/php.ini
memory_limit = 1G
```

**Fix correcto:** identificar la query (usar `Telescope` o `query log`) y paginar/chunkear.

### 2. opcache cache corrupto

**Síntoma:** después de un deploy aparece `class not found` o métodos inexistentes que sí existen en disco.

**Fix:**
```bash
docker compose exec api php artisan optimize:clear
docker compose restart api
```

**Prevención:** en deploy productivo, después de actualizar código:
```bash
php artisan optimize:clear
php artisan optimize        # config:cache + route:cache + view:cache
```

### 3. Fatal error en boot / ServiceProvider

**Síntoma:** la app no arranca, error consistente en logs.

**Fix:** revisar el último cambio en `apps/api/app/Providers/` o `bootstrap/app.php`. Rollback rápido.

### 4. Timeout en upstream (no crash de php-fpm, parece 502)

**Síntoma:** algunos endpoints responden 504, otros ok.

**Causa:** request tomó > `fastcgi_read_timeout` (hoy 60s — ver `docker/nginx/default.conf`).

**Fix corto:** identificar endpoint lento, ver si query pesada / N+1, optimizar.

### 5. Connection refused a MySQL desde dentro del contenedor api

**Síntoma:** logs Laravel `SQLSTATE[HY000] [2002] Connection refused`.

**Causa:** MySQL caído (no php-fpm). Ver [`bd-llena.md`](bd-llena.md) y verificar `mysql` container.

```bash
docker compose ps mysql
docker compose restart mysql
```

### 6. Disk full

php-fpm no puede escribir logs ni sesión → muere.

Ver [`bd-llena.md`](bd-llena.md) para liberar BD, y para el host:

```bash
df -h /
docker system prune -af   # libera imágenes/contenedores huérfanos
```

## Validación post-recovery

```bash
# 1. Health endpoint
curl -sf http://localhost:8080/up && echo "OK"

# 2. Endpoint de auth (no toca BD pesada pero usa todo el stack)
curl -s http://localhost:8080/api/v1/public/locales | jq '.data | length'

# 3. Endpoint público de menú (toca BD)
curl -s http://localhost:8080/api/v1/public/menu/tacos-el-gordo | jq '.data.local.nombre'
```

Todos deben responder rápido y consistentes.

## Hardening — bajar la probabilidad de que pase

### Healthcheck en docker-compose

Pendiente añadir (Fase 5):

```yaml
api:
  healthcheck:
    test: ["CMD", "curl", "-fsS", "http://localhost:9000/status"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 30s
```

Con healthcheck, el orquestador puede reiniciar automáticamente sin esperar al humano.

### Memory soft cap por worker

En `php-fpm` pool config:
```ini
pm.max_requests = 500   ; worker se recicla cada 500 requests (evita leaks)
```

### Sentry (cuando se integre)

Cualquier fatal antes del crash queda capturado con stacktrace. Hoy se pierde si nadie estaba mirando logs.

## Postmortem obligatorio

Crash de php-fpm = service down = **siempre** postmortem, no importa cuán corto fue el downtime. Plantilla en `docs/runbook/postmortems/` (a crear en su primer uso).

Incluir:
- Timestamps de detección, fix aplicado, validación.
- Causa raíz (no "lo reinicié y funcionó" — eso no es causa).
- Acción preventiva concreta (no "mejorar monitoring" — específico).
