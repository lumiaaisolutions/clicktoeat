# Postmortem — 503 intermitente + SSH cortado por límite de recursos del hosting Business

> **Date of incident**: 2026-08-05/06
> **Authors**: @fernando (con Claude Code)
> **Status**: closed
> **Severity**: 🔴 SEV-1 (down)

## TL;DR

El 5-6 de agosto, `clicktoeat-api.lumiaaisolutions.com` empezó a devolver 503 de forma intermitente y las sesiones SSH al hosting se cortaban justo después de autenticar — el panel completo dejó de mostrar datos ("no aparece ningún registro"). Causa: el plan **Business Web Hosting** (que hospeda 13 sitios, no solo ClickToEat) llegó al 100% de su cuota de recursos (CPU/procesos) en las últimas 24h. Se resolvió con el "Resource Boost" gratuito de Hostinger (24h, 5x CPU).

## Impacto

- **Servicios afectados**: API y, por consecuencia, todo el panel admin (sin datos) y probablemente la landing pública.
- **Locales afectados**: todos (hosting compartido).
- **Detección**: reporte del owner ("ya no aparece ningún registro") — no había alerta automática.
- **Datos perdidos / filtrados**: no.

## Timeline (hora local MX)

| Hora | Evento |
|------|--------|
| ~13:00 | Sesión de trabajo: deploy de Clicky (F103) — 2 deploys de API + 1 de web, además de varias conexiones SSH consecutivas (env, seeder, verificación). |
| ~14:20 | Owner reporta "ya no aparece ningún registro". |
| 14:20-14:40 | Se confirma API en 503 y SSH autenticando pero cortando la sesión al instante — sin shell no se puede diagnosticar. hPanel del VPS (1698236, IP 2.24.123.93) muestra recursos sanos (CPU 3%, RAM 24%) — **falsa pista**, ese VPS no es el que hospeda ClickToEat. |
| 14:40 | Reboot del VPS 1698236 vía hPanel — no resuelve nada (VPS equivocado). |
| 14:40-14:44 | Confusión con la IA "Ask AI" de hPanel, que reportó datos de otro servicio (`tradetrove-backend`) — diagnóstico descartado tras verificar con `ssh -v` que la autenticación en el puerto 65002 sí completaba (imposible si sshd no escuchara ahí, como afirmaba). |
| 14:44 | Se identifica que ClickToEat vive en **Hostinger Business Web Hosting** (hPanel → Websites), un producto distinto al VPS listado — usuario `u221820910`, IP `86.38.202.72`. |
| 14:44 | hPanel muestra banner: *"Your hosting resource limits have been reached"* en el plan Business, `Resources used in the last 24 hours: 100%`. |
| 14:44 | Owner activa **"Boost resources"** (gratis, 24h, 5x CPU / 2x RAM / 200 PHP workers vs 60 / 400 procesos máx vs 120 — límite 1 vez al mes). |
| 14:45 | `/up` responde 200 estable, SSH vuelve a funcionar (`ssh -v` confirma auth + exec OK). `load average` seguía en ~39 (rezago del pico), pero solo 16 procesos activos — nada descontrolado. |

## Causa raíz

1. El plan **Business Web Hosting** aloja **13 sitios** compartiendo un mismo pool de CPU/procesos/PHP-workers (60 workers, 120 procesos máx — límites bajos para un plan compartido).
2. La combinación de: 2 deploys de API seguidos (`composer install`, cache rebuild), múltiples conexiones SSH en sucesión rápida, y llamadas salientes a Gemini (algunas fallando con 429, ver `docs/features/clicky-assistant.md`) probablemente empujó el uso agregado del plan al 100% en la ventana de 24h — no hay forma de aislar cuál de los 13 sitios lo causó sin métricas por sitio (Hostinger Business no las expone).
3. **No hay alerta automática** de uso de recursos — se descubrió por el síntoma (503 + SSH cortado), no proactivamente.
4. Confusión adicional: la cuenta de Hostinger tiene un VPS separado (1698236, IP distinta) sin relación con ClickToEat — perdimos ~25 min investigando ahí antes de encontrar el hosting correcto. `docs/infra/deploy-hostinger.md` no distingue claramente "VPS" (producto que aparece en `/vps`) de "Business Web Hosting" (producto real donde vive el sitio, bajo `/websites`) — son cosas distintas en el mismo panel.

## ¿Cómo se detectó?

- ❌ Alerta automática — no existe monitoreo activo de `/up` ni de recursos del hosting.
- ✅ Reporte de usuario (el owner).

## ¿Qué funcionó?

- El "Resource Boost" gratuito de Hostinger (1x/mes) resolvió el síntoma en minutos, sin costo.
- `ssh -v` (verbose) fue clave para refutar el diagnóstico erróneo de "Ask AI" con evidencia concreta (el handshake SSH completo prueba que sshd sí escuchaba en 65002).

## ¿Qué falló o fue lento?

- Sin alerta de uso de recursos — nos enteramos porque el owner no podía loguearse, no antes.
- Se perdió tiempo investigando el VPS equivocado (1698236) porque no estaba claro en la documentación que ClickToEat vive en un producto de hosting *distinto* al VPS de la cuenta.
- El diagnóstico de la IA de hPanel ("Ask AI") fue incorrecto y específico de otro servicio — no se puede confiar ciegamente en ese tipo de herramientas sin verificar.

## Acciones correctivas

| # | Acción | Owner | Fecha objetivo | Status | Link |
|---|--------|-------|----------------|--------|------|
| 1 | Aclarar en `docs/infra/deploy-hostinger.md` que ClickToEat vive en **Business Web Hosting** (hPanel → Websites), no en el VPS 1698236 de la misma cuenta — documentar ambos IDs/IPs para no confundirlos de nuevo | — | — | Open | — |
| 2 | Evaluar monitoreo externo simple de `/up` (UptimeRobot o similar, gratis) para detectar 503 antes que el owner | — | — | Open | — |
| 3 | Si el 503 se repite, considerar mover a un plan con más headroom (Cloud/VPS dedicado) en vez de depender del Boost mensual | — | — | Open | — |
| 4 | Documentar este incidente | @fernando | 2026-08-06 | ✅ Done | (este archivo) |

## Lecciones aprendidas

- **Hostinger Business Hosting comparte recursos entre TODOS los sitios de la cuenta** (13 en este caso) — un pico de actividad en el deploy de un solo proyecto puede agotar la cuota de todos.
- El síntoma "SSH autentica pero la sesión muere al instante" (sin importar reboot de un VPS no relacionado) es la firma de un límite de proceso/CPU del lado del hosting compartido, no de un problema de red o de sshd mal configurado.
- Cuando hay múltiples productos Hostinger en la misma cuenta (VPS + Websites/Business), verificar SIEMPRE la IP real del servicio afectado antes de diagnosticar — `hpanel.hostinger.com/vps` y `hpanel.hostinger.com/websites` son productos independientes aunque compartan el login.
- No confiar en diagnósticos de "Ask AI" (o cualquier asistente automático) sin verificar contra evidencia directa (en este caso, `ssh -v` refutó el diagnóstico en segundos).

## Apéndice

- Ver `docs/features/clicky-assistant.md` — nota sobre el 429 persistente de Gemini (causa no confirmada de este incidente, pero corrió en la misma ventana).
