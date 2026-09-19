# ADR-017 — Reverb autoalojado ya es viable en el VPS dedicado, pero polling sigue siendo el default

> **Estado:** aceptada.
> **Fecha:** 2026-09-14.
> **Decisor:** (pendiente de confirmación del owner para activar) — por ahora el equipo técnico documenta la reevaluación.
> **Relación:** complementa [ADR-015](ADR-015-realtime-polling-definitivo.md) (polling definitivo) y reabre parcialmente la premisa de infraestructura de [ADR-013](ADR-013-realtime-pusher-protocol-managed.md).

## Contexto

[ADR-015](ADR-015-realtime-polling-definitivo.md) fijó **polling cada 15s** como la
arquitectura de tiempo real de v1, por dos razones:

1. El owner **rechazó** cualquier servicio de terceros/administrado (Pusher, Ably) —
   decisión de no depender de un proveedor externo más en la cadena crítica.
2. **Reverb autoalojado no era viable** en el hosting viejo (shared hosting con
   CageFS): el puerto del WebSocket **no era alcanzable desde afuera** (verificado
   empíricamente en ADR-013).

El **2026-08-07 migramos a un VPS dedicado** (Ubuntu 24.04, root vía `deploy` +
sudo, Nginx propio por sitio, control total de puertos y systemd). **La razón #2 ya
no aplica**: en el VPS dedicado sí podemos abrir un puerto, correr un daemon y
proxear el `Upgrade` de WebSocket por Nginx. La razón #1 (no-terceros) **tampoco
aplica a Reverb**, porque Reverb es **autoalojado** (paquete oficial de Laravel, sin
servicio externo ni cuota).

## Decisión

**Polling 15s sigue siendo el default en producción.** No se activa Reverb de forma
unilateral porque:

- Levantar un daemon nuevo (`reverb:start`) + config de Nginx toca el **VPS
  compartido con otros 4 productos LUMIA en vivo** (`lumia-hq`, `lumia-portal`,
  `lumina-restaurante`, Docker de `tradetrove`/`n8n`/`ollama`). Cualquier cambio a
  nivel sistema requiere confirmación del owner (regla de CLAUDE.md).
- Para el volumen actual (pocos locales, bajo pedidos/min), 15s de retraso es una
  degradación aceptable, no un bloqueante de producto (misma conclusión de ADR-015).

**Pero** se deja registrado que la activación **ya es técnicamente viable y barata**
(solo config + un daemon supervisado por PM2/systemd, cero cambio de código de
dominio) — los eventos `ShouldBroadcast` ya existen en el código, dormidos.

## Checklist de activación (cuando el owner lo apruebe)

Estimado: ~medio día, reversible. **Requiere OK del owner** por ser cambio en VPS compartido.

1. **API**: `composer require laravel/reverb` → `php artisan reverb:install`.
2. **.env (api)**: `BROADCAST_CONNECTION=reverb` + credenciales `REVERB_APP_*` +
   `REVERB_HOST`/`REVERB_PORT` (puerto interno, p.ej. 8085).
3. **Daemon**: `php artisan reverb:start` supervisado por **PM2** (igual que
   `clicktoeat-web`) o un `systemd` unit dedicado — sobrevive reboots.
4. **Nginx**: `location /app` (o subdominio `ws.clicktoeat...`) con `proxy_pass` al
   puerto interno + headers `Upgrade`/`Connection` para WebSocket. `sudo nginx -t`
   antes de `reload` (VPS compartido).
5. **Firewall**: no exponer el puerto de Reverb directo; solo vía Nginx (TLS del
   subdominio con el mismo certbot).
6. **Frontend**: `npm i laravel-echo pusher-js` + configurar Echo apuntando al host
   de Reverb + escuchar los canales de los eventos ya existentes
   (`PedidoCreado`, `PedidoEstadoActualizado`, `MeseroLlamado`). Reemplazar el
   `setInterval(15_000)` de `cocina`/`mesero` por el listener (dejar polling como
   fallback si el socket cae).
7. **Verificar**: pedido nuevo aparece en cocina en <1s; caer el socket → vuelve a polling.

## Consecuencias

- **Positiva**: el tema deja de ser un "cabo suelto" — es una decisión explícita
  (quedarse en polling) con un plan de activación listo para ejecutar el día que se
  quiera, sin re-investigar nada.
- **Negativa**: ninguna nueva respecto a ADR-015 — seguimos con hasta 15s de retraso
  hasta que (si) se active.

## Estado de implementación (cerrado 2026-09-18)

El polling está **implementado y es uniforme** en las 5 pantallas operativas, a
**15 s** (el estándar de ADR-015):

| Pantalla | Intervalo |
|---|---|
| `/admin/cocina` | 15 s |
| `/admin/mesero` | 15 s |
| `/admin/mesas` | 15 s |
| `/admin/caja` | 15 s |
| `/admin/pedidos` | 15 s (antes 30 s — alineado el 2026-09-18 para que los pedidos entrantes del landing aparezcan con la misma prontitud) |

Con esto, realtime queda **cerrado** como feature: no hay trabajo pendiente en la
opción polling. La activación de Reverb (checklist arriba) es una decisión futura
del owner, no un pendiente abierto.

## Gatillo recomendado para activar

Cuando pase **cualquiera** de estos, reconsiderar:
- Un local con **alto volumen** se queja del retraso de 15s en cocina/mesero.
- El polling de 15s por local empieza a **cargar el servidor** de forma notable al
  crecer el número de locales activos.
