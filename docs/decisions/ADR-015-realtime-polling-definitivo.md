# ADR-015 — Polling es la arquitectura de realtime definitiva de v1 (no un stopgap)

> **Estado:** aceptada.
> **Fecha:** 2026-07-16.
> **Decisor:** Owner del proyecto.
> **Supersede a:** [ADR-013](ADR-013-realtime-pusher-protocol-managed.md), en la parte de "usar un servicio administrado" (la parte de "Reverb autoalojado no es viable" de ADR-013 sigue vigente y no cambia).

## Contexto

ADR-013 concluyó que Reverb autoalojado no es viable en el hosting actual (puerto no alcanzable desde afuera, verificado empíricamente) y recomendó un servicio administrado compatible con protocolo Pusher (Pusher Channels o Ably) como alternativa — ambos con tier gratuito suficiente para el volumen actual.

Al construir el resto del paquete (Etapas A-D), se le presentó al owner esa opción para conectarla de verdad. **El owner la rechazó explícitamente**: no quiere ningún servicio de terceros ni de paga para esto, ni siquiera en su tier gratuito. Esto no es una objeción de costo — es una decisión de no depender de un proveedor externo más en la cadena operativa crítica (cocina→mesero→caja).

Con esa restricción, las opciones de ADR-013 quedan así:
- Reverb autoalojado → ya descartado (puerto no alcanzable).
- Pusher/Ably administrado → descartado ahora por decisión explícita del owner.
- Soketi autoalojado vía Passenger (Node) → **seguía sin verificarse de punta a punta** en ADR-013, y verificarlo requeriría desplegar una app Node nueva a producción sólo para probar si Passenger reenvía el `Upgrade` de WebSocket — una acción de infraestructura no trivial, no autorizada en el alcance actual, y con probabilidad de éxito incierta incluso si se intenta.

## Decisión

**Se usa polling cada 15 segundos como la arquitectura de tiempo real de v1 — decisión definitiva, no un parche temporal.** Las pantallas de cocina (`/admin/cocina`) y mesero (`/admin/mesero`) ya implementan esto (`setInterval` de 15s, ver código). No se agrega ninguna dependencia de red nueva, ni de pago ni de terceros.

Los eventos de broadcasting ya escritos (`PedidoCreado`, `PedidoEstadoActualizado`, `MeseroLlamado`) **se conservan en el código** — implementan `ShouldBroadcast`, pero sin `BROADCAST_CONNECTION` configurado (default `log`) no llegan a nadie y no rompen nada. Quedan ahí sin costo, listos para activarse el día que se decida invertir en infraestructura propia (Soketi autoalojado) o cambie la postura sobre servicios de terceros — activar Pusher/Ably/Soketi después sería sólo config (`.env` + `npm install laravel-echo pusher-js` en frontend), cero cambio de código de dominio.

## Consecuencias

### Positivas
- Cero costo, cero dependencia nueva de terceros — exactamente lo que pidió el owner.
- Cero riesgo de infraestructura nueva sobre un hosting ya frágil.
- El código ya escrito para eventos no se desperdicia — sólo queda inactivo.

### Negativas
- Cocina/mesero ven pedidos/llamados con hasta 15s de retraso, no instantáneo. Para el volumen actual (pocos locales, bajo volumen de pedidos por minuto) es una degradación aceptable, no un bloqueante de producto.
- "Llamar al mesero" también tarda hasta 15s en aparecer — peor caso aceptable dado el contexto (un mesero real tarda más que eso en llegar a la mesa de todos modos).
- Si el volumen crece mucho, 15s de polling por local puede generar carga innecesaria en el servidor — revisar si se vuelve un problema real antes de optimizar prematuramente.

## Referencias

- [ADR-013](ADR-013-realtime-pusher-protocol-managed.md) — la mitad de esa decisión (Reverb no viable) sigue vigente.
- [ADR-012](ADR-012-plan-499-operacion-de-salon-dine-in.md)
- `apps/web/src/app/admin/cocina/page.tsx`, `apps/web/src/app/admin/mesero/page.tsx` — implementación real del polling.
