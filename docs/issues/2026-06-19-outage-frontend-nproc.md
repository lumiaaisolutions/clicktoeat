# Outage 2026-06-19 — Frontend 503 tras deploy de auditoría

> Post-mortem del incidente que dejó `clicktoeat.lumiaaisolutions.com` en
> HTTP 503 durante ~50 minutos la noche del 19 de junio de 2026.

## Resumen

- **Detección**: `deploy-web.sh` reportó `Health check FAIL — HTTP 503` al
  terminar el deploy del frontend con los cambios de la auditoría
  (commit `08e41a2`).
- **Causa raíz**: límite de procesos/threads (NPROC) de la cuenta Hostinger
  alcanzado. `node` no podía crear los worker threads de V8/libuv y morí en
  loop al arrancar (`pthread_create: Resource temporarily unavailable`).
- **Mitigación**: rollback al bundle anterior (Jun 18) con `mv .next.previous .next`
  manual via SSH interactivo. Sitio restablecido en ~30 min desde el reporte.
- **Cliente impacto**: cero pedidos perdidos — los owners no usan el
  sistema entre semana, descubrimos antes del fin de semana.
- **API impacto**: cero — el API Laravel quedó deployada y nunca dejó de
  servir. Las hardenings de la auditoría siguen activas en API.

## Timeline (CST México)

| Hora | Evento |
|---|---|
| 21:18 | `./scripts/deploy-api.sh --skip-tests` ejecutado. ✅ Health 200, todos los headers de seguridad activos. |
| 21:19 | `./scripts/deploy-web.sh --dry-run` muestra contenido a sincronizar — incluye sqlite y testing/. Se patchea el script para excluirlos. |
| 21:20 | `./scripts/deploy-web.sh` ejecutado real. Build local OK. Restart de Passenger pedido. |
| 21:20 | `Health check FAIL — devolvió HTTP 503` reportado por deploy-web.sh. |
| 21:25 | Decisión: rollback inmediato. SSH key no encontrada en path esperado (`~/.ssh/hostinger_clicktoeat`). Creamos symlink a `~/.ssh/id_ed25519`. |
| 21:30 | Primer intento de rollback: comando inline SSH multi-línea → `exec request failed on channel 0`. CageFS rechaza inline commands largos. |
| 21:35 | Plan B: SSH interactivo. ✅ Rollback ejecutado: `mv .next .next.failed`, `mv .next.previous .next`, swap idem `public`, `touch tmp/restart.txt`. |
| 21:38 | `curl https://clicktoeat.lumiaaisolutions.com/` → HTTP/2 200. **Servicio restablecido.** |
| 21:45 | Intentamos leer logs via SSH inline → "Connection reset by peer" repetido. Hostinger fail2ban activado por intentos de SSH. |
| 21:50 | Diagnóstico ciego: hipotetizamos crash de sileo (SSR + motion) — incorrecto. |
| 22:00 | Commit `5d2cdc5` aplicado: `Toaster` con `dynamic({ssr:false})`, `store/toast.ts` lazy `await import('sileo')`. Bundle First Load JS baja de 226 kB → 179 kB. |
| 22:10 | Logs vía hPanel File Manager — descubrimos el crash real: `pthread_create: Resource temporarily unavailable` + cientos de stack traces de `uv_thread_create` assertion failures. |
| 22:15 | Re-diagnóstico correcto: NPROC limit, no sileo. Documentación + plan de fix infra. |

## Causa raíz

```
node[880988]: pthread_create: Resource temporarily unavailable

# /opt/alt/alt-nodejs20/root/bin/node[X]:
# std::unique_ptr<...> node::WorkerThreadsTaskRunner::DelayedTaskScheduler::Start()
# at ../src/node_platform.cc:68
# Assertion failed: (0) == (uv_thread_create(t.get(), start_thread, this))
```

CloudLinux **LVE Manager** (Hostinger's container isolation) **rechaza crear
nuevos threads** porque la cuenta `u221820910` alcanzó su NPROC limit.

Cuando Passenger arranca el server Next.js standalone, el proceso `node` necesita:
- 1 thread principal
- ~4 workers de V8 (uno por core lógico)
- ~4 threads de libuv I/O pool (default `UV_THREADPOOL_SIZE=4`)
- Threads adicionales de Sentry instrumentación + Next telemetry

**~10-15 threads por proceso Node** al boot.

Cada vez que Passenger trataba de arrancar el server con el bundle nuevo, fallaba
en `pthread_create`. El proceso moría → Passenger restart → moría otra vez →
ciclo infinito. El stderr.log capturó >100 stack traces idénticos antes del rollback.

**Por qué el bundle viejo funciona** (rollback exitoso): es ligeramente más
ligero (sin sileo + motion + dompurify + Sentry replay con masking), arranca
con suficiente margen bajo el límite. Pero **estamos al borde** — cualquier
spike de tráfico que dispare más workers puede repetir el crash en cualquier
momento.

## Lo que NO era el bug (aunque lo creí inicialmente)

- ❌ Sileo accediendo a `window`/`document` en SSR
- ❌ `motion@12` (dep de sileo) crasheando en Node
- ❌ Bundler standalone de Next 14.2.x sin respetar `'use client'` boundaries
- ❌ CSS de `sileo/styles.css` mal resuelto en standalone
- ❌ Cambios de Sentry mask/scrub

El fix de sileo (`5d2cdc5`) **es buen código y debe quedarse mergeado** — reduce
el First Load JS y desacopla el módulo. Pero NO era la causa del 503.

## Acciones inmediatas

### Capa 1 — Reducir uso de threads del Node server (sin pagar más)

En hPanel → Hosting → clicktoeat.lumiaaisolutions.com → Node.js → la app activa
→ Environment variables, agregar:

```
UV_THREADPOOL_SIZE=2
NODE_OPTIONS=--max-old-space-size=512
NEXT_TELEMETRY_DISABLED=1
```

Restart de la app desde el panel. Reduce ~40-50% el uso de threads por proceso.

Detalles técnicos: ver [`docs/infra/passenger-node-tuning.md`](../infra/passenger-node-tuning.md).

### Capa 2 — Pedir más NPROC a Hostinger (medio plazo)

Plan Business típicamente tiene NPROC=100. Para Next.js standalone bajo
Passenger conviene 150-200. Contactar soporte:

> Mi aplicación Next.js en clicktoeat.lumiaaisolutions.com está crasheando
> con `pthread_create: Resource temporarily unavailable` y `uv_thread_create`
> assertion failed. Llegamos al límite NPROC de la cuenta u221820910. ¿Pueden
> aumentarlo a 200?

### Capa 3 — Estratégico (no urgente)

Considerar migrar a un plan VPS dedicado o Vercel/Cloudflare Pages para el
frontend si seguimos viendo este límite tras Capa 1+2. Next.js standalone +
Passenger en shared CageFS es notoriamente threads-hungry y no es el caso de
uso óptimo del producto Hostinger.

## Lecciones aprendidas

1. **No diagnosticar sin log**. Hipotetizé sileo basado en el momento del
   crash + un grep en `node_modules`. Logs habrían dirigido al fix correcto
   45 min antes. Regla: si el log no está disponible, esperar 30 min y leerlo
   por hPanel, NO redeployar con teoría.

2. **CageFS rechaza `ssh host 'cmd inline largo'`** con exit message
   `exec request failed on channel 0`. Para automatización usar siempre
   `ssh host 'bash -s' <<EOF ... EOF`. El nuevo `scripts/rollback-web.sh`
   ya implementa este patrón.

3. **Hostinger fail2ban** se dispara con ~3-5 intentos SSH fallidos.
   Reintentos extienden el ban. Si SSH empieza a fallar, parar 30-60 min y
   usar hPanel File Manager para acceso alterno a logs/files.

4. **`deploy-web.sh` no tiene rollback nativo**. La línea 182 sólo imprime
   el comando manual. Ya creamos `scripts/rollback-web.sh` que automatiza el
   procedimiento y resiste CageFS quirks.

5. **NPROC limit es invisible en el output normal**. No aparece en
   `df`, `free`, `top` desde el SSH del usuario (CageFS lo oculta). Solo se
   ve cuando un proceso intenta `fork()`/`pthread_create()`. Monitorear
   reactivamente vía error logs no es suficiente — habría que pedir métricas
   al panel de Hostinger.

## Status actual

- Sitio web: 🟢 HTTP/2 200 (bundle viejo Jun 18, pre-audit)
- API Laravel: 🟢 Live con audit completo (`08e41a2`)
- Fix sileo: ✅ Committed `5d2cdc5`, pushed a GitHub, NO deployeado a prod
- Env vars para Passenger: ⏳ pendiente aplicar en hPanel
- Re-deploy web: ⏳ pendiente — bloqueado hasta aplicar env vars de Capa 1
