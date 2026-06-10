# Postmortem — `<título corto y descriptivo>`

> **Date of incident**: YYYY-MM-DD
> **Authors**: @nombre1, @nombre2
> **Status**: draft | in-review | closed
> **Severity**: 🔴 SEV-1 (down) | 🟠 SEV-2 (degraded) | 🟡 SEV-3 (workaround) | ⚪ SEV-4 (cosmetic)

## TL;DR

Una sola frase: qué pasó, por cuánto tiempo, a quién afectó.

> Ejemplo: "El 15 de julio entre 14:23 y 14:58 UTC, la API estuvo no respondiendo (502) debido a que MySQL se quedó sin disco; los pedidos públicos no se pudieron crear durante 35 min."

## Impacto

- **Servicios afectados**: API / frontend / panel admin / pedidos públicos.
- **Locales afectados**: todos / sólo X / Y locales.
- **Pedidos perdidos** (estimado): N pedidos en la ventana de incidente.
- **Ingresos no concretados** (estimado, si aplica): $X MXN.
- **Detección**: ¿reporte de owner? ¿alerta automática? ¿descubierto por nosotros?
- **Datos perdidos / filtrados**: sí / no — describir.

## Timeline (UTC)

| Hora | Evento |
|------|--------|
| 14:18 | Cron de mantenimiento ejecuta `OPTIMIZE TABLE sessions` — consume el último GB de disco. |
| 14:23 | Primera 5xx detectada por UptimeRobot (alerta a #alertas-clicktoeat). |
| 14:25 | On-call @persona ack la alerta. |
| 14:28 | Investigación: confirma disco lleno en MySQL via SSH. |
| 14:35 | Aplicado runbook `bd-llena.md` — `DELETE` de sessions/cache viejos. |
| 14:42 | Disco baja a 78%; MySQL responde. |
| 14:50 | API responde 200 consistente. |
| 14:58 | Frontend verificado funcional con smoke test manual. |
| 15:30 | Comunicación interna del cierre. |

## Causa raíz

Por qué pasó. **No** "porque MySQL se llenó" — eso es el síntoma. La causa raíz suele ser sistémica:

> Ejemplo:
> 1. `sessions` con driver `database` y sin TTL real → crecía indefinidamente desde el deploy de hace 8 meses.
> 2. La métrica de disco se monitoreaba en el panel de Hostinger, pero sin alerta automática (sólo manual).
> 3. El cron `OPTIMIZE TABLE` que normalmente liberaba espacio en realidad escribió un log temporal del tamaño completo de la tabla → cruzó el 100%.

## ¿Cómo se detectó?

- ✅ Alerta automática (`UptimeRobot`, `Sentry`, log de errores, etc.)
- ❌ Reporte de usuario
- ❌ Descubrimiento accidental

Si no fue por alerta automática, eso es un action item.

## ¿Qué funcionó?

Lo que ayudó a resolverlo rápido. Conservar lo bueno:

- Runbook `bd-llena.md` existía y tenía el comando exacto a correr.
- El equipo ack y comunicó en < 5 min.

## ¿Qué falló o fue lento?

- No había alerta a 85% de disco — descubrimos cuando ya era 100%.
- El runbook no mencionaba que `OPTIMIZE TABLE` puede empeorar momentáneamente.

## Acciones correctivas

> Cada action item: **owner + fecha + tracking link**. Sin owner no es un action item.

| # | Acción | Owner | Fecha objetivo | Status | Link |
|---|--------|-------|----------------|--------|------|
| 1 | Alerta a 85% de disco MySQL (cualquier proveedor de monitoring) | @persona | 2026-07-20 | Open | [#issue-N](...) |
| 2 | Migrar sessions a Redis con TTL | @persona | 2026-08-15 | Open | [#issue-N](...) |
| 3 | Actualizar `bd-llena.md` con caveat de `OPTIMIZE TABLE` | @persona | 2026-07-16 | ✅ Done | [PR-N](...) |
| 4 | Documentar este incidente en `docs/runbook/postmortems/` | @persona | 2026-07-17 | ✅ Done | (este archivo) |

## Lecciones aprendidas

Knowledge que vale para futuros incidentes / decisiones de diseño:

- Los drivers `session=database` y `cache=database` **deben** tener cron de limpieza desde el día uno. O migrar a Redis con TTL.
- El alerting a 95% es **tarde**. Necesitamos 70/85/95 en niveles.
- Las acciones de mantenimiento (`OPTIMIZE`, `ALTER`) pueden empeorar antes de mejorar. No correr cuando el sistema ya está degradado.

## Apéndice

- Capturas de pantalla de gráficas en el momento del incidente.
- Output relevante de logs (anonimizado si tiene PII).
- Links a runbooks consultados.
- Mensajes clave de Slack durante el incidente (con timestamps).
