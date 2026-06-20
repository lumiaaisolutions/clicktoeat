# Tuning de Node.js bajo Passenger en Hostinger CageFS

> Ajustes para que la app Next.js standalone arranque dentro del NPROC limit
> de CloudLinux LVE. Lección del outage del 2026-06-19.

## El problema en una línea

Cada proceso Node (`next start`) consume **~10-15 threads** al boot.
CloudLinux limita el total por usuario. Si el bundle es pesado y/o llegan
varios workers a arrancar a la vez, llegamos al límite y `pthread_create` falla.

## Síntoma

En `~/domains/clicktoeat.lumiaaisolutions.com/nodejs/stderr.log`:

```
node[X]: pthread_create: Resource temporarily unavailable

# /opt/alt/alt-nodejs20/root/bin/node[Y]:
# std::unique_ptr<...> node::WorkerThreadsTaskRunner::DelayedTaskScheduler::Start()
# at ../src/node_platform.cc:68
# Assertion failed: (0) == (uv_thread_create(...))
```

(repetido N veces porque Passenger trata de revivir el proceso en bucle).

Sitio devuelve HTTP 503 desde el LiteSpeed frontend.

## Fix — Env vars en hPanel

**hPanel** → Hosting → `clicktoeat.lumiaaisolutions.com` → **Node.js** →
selecciona la app → **Environment variables**:

| Variable | Valor | Por qué |
|---|---|---|
| `UV_THREADPOOL_SIZE` | `2` | Default es 4. libuv usa el pool para FS, DNS, crypto. 2 alcanza para tráfico moderado. Ahorra 2 threads por proceso. |
| `NODE_OPTIONS` | `--max-old-space-size=512` | Limita heap V8 a 512 MB. Default puede llegar a 1.7 GB y obliga a Node a reservar más memoria → más worker threads de GC. |
| `NEXT_TELEMETRY_DISABLED` | `1` | Next.js arranca un thread de telemetría para reportar métricas anónimas. No lo necesitamos en prod. |

Después del cambio, **Restart** la app desde el mismo panel
(o `touch ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/tmp/restart.txt`).

## Verificación

```bash
# Inmediato — sitio debe seguir 200
curl -sI https://clicktoeat.lumiaaisolutions.com/ | head -3

# Inspección de threads del proceso Node (vía SSH interactivo)
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72

# Adentro — listar procesos Node tuyos
ps -ef | grep node | grep -v grep
# Por cada PID, ver cuantos threads tiene
cat /proc/<PID>/status | grep Threads
# Ideal: 8-10 (antes ~14-16)
```

## Si el fix de Capa 1 no alcanza

Contacta soporte de Hostinger para aumentar NPROC limit:

> Mi aplicación Next.js en `clicktoeat.lumiaaisolutions.com` está crasheando
> con `pthread_create: Resource temporarily unavailable`. Llegamos al límite
> NPROC de la cuenta u221820910. Ya apliqué `UV_THREADPOOL_SIZE=2` y
> `--max-old-space-size=512`. ¿Pueden aumentar el NPROC a 200?

## Detalles técnicos — por qué Node usa tantos threads

Un proceso Node 20 con Next.js standalone arranca aproximadamente:

| Thread | Cuántos | Para qué |
|---|---|---|
| Main JS thread | 1 | Event loop principal |
| V8 background workers | ~4 (un núcleo lógico cada uno) | JIT, GC, codegen background |
| libuv thread pool | `UV_THREADPOOL_SIZE` (default 4) | FS async, `crypto.pbkdf2`, DNS, addon work |
| HTTP/2 session | 1-2 | Multiplexing si hay HTTP/2 |
| Inspector | 1 | Solo si `--inspect` |
| Next.js telemetry | 1 | Solo si `NEXT_TELEMETRY_DISABLED` no está |
| Sentry instrumentation | 1-2 | Solo si `@sentry/nextjs` cargó |

= **10-15 threads/proceso** en cold start.

CloudLinux LVE Manager cuenta TODOS los threads del usuario, no solo del
proceso. Con LSPHP corriendo (PHP-FPM workers) + Node + cron + SSH +
mysqldump del backup nocturno, llegar al límite es trivial.

## Alternativas a futuro

Si el patrón de crashes recurre incluso con NPROC aumentado:

1. **Reducir N de instancias** de Passenger via `passenger_min_instances 1` y
   `passenger_max_instances 2` (configurable desde hPanel → Node.js → Advanced).
2. **Pre-renderizar más rutas** (SSG en vez de SSR/Dynamic) en
   `app/[slug]/page.tsx` para no necesitar el server runtime por cada hit.
3. **Migrar a host con LVE más generoso** (Cloud / VPS dedicado) o
   serverless edge (Vercel, Cloudflare Pages).

## Referencias

- Post-mortem del incidente: [`docs/issues/2026-06-19-outage-frontend-nproc.md`](../issues/2026-06-19-outage-frontend-nproc.md)
- Node docs sobre `UV_THREADPOOL_SIZE`: https://docs.libuv.org/en/v1.x/threadpool.html
- CloudLinux LVE limits docs: https://docs.cloudlinux.com/lve_resources/
