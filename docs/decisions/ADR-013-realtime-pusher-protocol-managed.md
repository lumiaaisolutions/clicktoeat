# ADR-013 — Realtime vía servicio administrado compatible con protocolo Pusher (no Reverb autoalojado)

> **Estado:** superseded por [ADR-015](ADR-015-realtime-polling-definitivo.md) (2026-07-16) — el owner rechazó explícitamente cualquier servicio de terceros o de paga para esto, incluyendo el tier gratuito de Pusher/Ably. Este documento queda como registro histórico de por qué se descartó Reverb autoalojado (esa parte sigue vigente); la recomendación de usar Pusher/Ably ya NO aplica.
> **Fecha:** 2026-07-14.
> **Decisor:** Owner del proyecto, con recomendación técnica verificada contra el VPS real.
> **Depende de:** [ADR-012](ADR-012-plan-499-operacion-de-salon-dine-in.md) (requiere realtime para cocina/mesero/caja).

## Contexto

ADR-012 requiere tiempo real (no polling) para el flujo cocina→mesero→caja. El plan inicial era Laravel Reverb (WebSocket server en PHP), que es lo que usa el sistema hermano Lumina. Antes de comprometernos, se verificó de forma empírica si el hosting actual (Hostinger VPS + CageFS, ver CLAUDE.md) puede correr un proceso de WebSocket persistente.

## Verificación realizada (2026-07-14, contra el VPS real)

1. `ulimit -a` → límites de procesos generosos (`max user processes 2060651`), sin restricción dura evidente de CageFS a este nivel.
2. Bind de un socket TCP de prueba en el puerto 39876 desde el propio VPS → **éxito** (`BIND_OK`).
3. Conexión a ese mismo puerto **desde fuera del VPS** (máquina externa) → **timeout, inalcanzable**.

**Conclusión**: el proceso puede escuchar localmente, pero el firewall de red del hosting bloquea puertos arbitrarios entrantes — solo 22/80/443 (y similares gestionados por el panel) están abiertos hacia afuera. Esto confirma lo que CLAUDE.md ya advertía ("funcionalmente comparte casi todas las limitaciones de un plan Shared"): no hay forma de exponer Reverb en su puerto propio (8080 por defecto) sin control a nivel de sistema operativo/firewall que esta cuenta no tiene (no hay WHM, no hay `iptables`, no hay acceso root real).

Adicionalmente, Reverb es un proceso PHP (Revolt event loop) que necesita mantenerse vivo de forma independiente al ciclo request/response de LSPHP — hoy el único mecanismo de proceso persistente ya probado en producción es **Passenger para Node** (`apps/web`, Next.js SSR). No hay evidencia ni precedente de un proceso PHP persistente fuera de ese modelo en esta cuenta.

## Decisión

**No se autoaloja Reverb.** Se usa un **servicio de terceros administrado, compatible con el protocolo Pusher** (Pusher Channels o Ably con adaptador de compatibilidad) como backend de broadcasting.

- Laravel `broadcasting.php` usa el driver `pusher` (nativo del framework) apuntando a las credenciales del servicio elegido — **cero cambio de arquitectura de aplicación** si en el futuro se migra a otro backend compatible con el mismo protocolo (Reverb self-hosted en otro hosting, Soketi, etc.): es solo config, no código.
- Frontend usa `laravel-echo` + `pusher-js` (igual que si fuera Reverb — Echo soporta ambos con el mismo driver `pusher`).
- No requiere abrir puertos nuevos, no requiere proceso persistente propio, no depende de CageFS/Passenger para nada de esto.

### Elección entre Pusher Channels y Ably

Cualquiera de los dos sirve; ambos tienen tier gratuito suficiente para el volumen actual (2 locales activos hoy). Recomendación: **Pusher Channels**, por ser el protocolo de referencia (Reverb y Soketi son reimplementaciones de SU protocolo, así que quedamos en el camino "canónico" y con más documentación/ejemplos de Laravel Echo). Confirmar límites de tier gratuito vs. plan pagado antes de implementar (canales concurrentes, mensajes/día) — esto es un detalle de setup, no bloquea la decisión de arquitectura.

## Alternativas consideradas

- **Laravel Reverb autoalojado**: descartado — **verificado empíricamente no viable** en el hosting actual (puerto no alcanzable desde afuera, sin control de firewall/OS).
- **Soketi (Node, protocolo Pusher) como "Node.js App" vía Passenger**, igual que `apps/web`: técnicamente plausible (Passenger para Node sí sostiene un proceso persistente y expone tráfico HTTP(S) por el puerto estándar del dominio, potencialmente incluyendo el `Upgrade` de WebSocket) — pero esto **no se verificó de punta a punta** (requeriría desplegar una app Node nueva en un subdominio, algo que ya no es "solo lectura" y no estaba autorizado en esta pasada). Queda como opción futura de self-hosting si el costo del servicio administrado se vuelve un problema — el driver `pusher` en Laravel hace este cambio trivial el día que se quiera intentar.
- **Seguir con polling 30s**: descartado por decisión explícita del owner en ADR-012 (quiere tiempo real real, no polling, para cocina/mesero/caja).
- **Migrar de hosting** (VPS con control real/root) solo para correr Reverb: descartado por ahora — costo/complejidad de migración no se justifica cuando un servicio administrado resuelve lo mismo sin tocar infraestructura.

## Consecuencias

### Positivas

- Cero riesgo de infraestructura nueva sobre un hosting ya frágil (cron sin shell real, sin Docker, sin sudo — ver CLAUDE.md).
- Path de código igual a si fuera Reverb (protocolo Pusher) — no hay lock-in fuerte, cambiar de proveedor es config.
- Servicio administrado maneja reconexión, escalado, presencia de canales — cosas que tendríamos que construir/operar nosotros con Reverb self-hosted.

### Negativas

- **Costo recurrente nuevo** dependiente de uso (mensajes/conexiones concurrentes) — a diferencia de Reverb (gratis si se pudiera self-hostear). Hay que dimensionar el tier pagado cuando el volumen de locales con Premium crezca.
- **Dependencia de un tercero más** en la cadena crítica (cocina/mesero/caja no funcionan si el servicio cae) — mismo tipo de riesgo que ya existe con Stripe, pero ahora también en el camino operativo en tiempo real, no solo en billing.
- Requiere salida a internet desde el navegador del cliente hacia el dominio del proveedor (revisar que no haya bloqueo de red en el Wi-Fi del restaurante — normalmente no es un problema, pero es una variable nueva a monitorear en operación real).

### Neutras

- Nueva variable de entorno / credenciales a gestionar en `apps/api/.env` (broadcasting driver + key/secret/cluster).
- Nuevo runbook operativo: qué hacer si el proveedor de realtime tiene una caída (fallback a polling manual temporal, documentar en `docs/runbook/`).

## Referencias

- [ADR-012 — Plan $499 operación de salón](ADR-012-plan-499-operacion-de-salon-dine-in.md)
- [`docs/features/realtime-reverb.md`](../features/realtime-reverb.md) — doc previo (aspiracional, Reverb self-hosted) — **superseded por este ADR** en lo referente a la elección de backend; el resto de su contenido (canales privados por tenant, eventos a broadcastear) sigue vigente y se reutiliza sobre el driver `pusher`.
