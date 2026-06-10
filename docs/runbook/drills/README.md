# Drills (simulacros)

Pruebas controladas de procedimientos críticos para verificar que **realmente** funcionan en producción.

> **"Untested backups don't exist."** Lo mismo aplica a runbooks de recuperación. Si nunca lo probaste, no sabes si funciona.

## Tipos de drill

| Drill                          | Frecuencia | Quién                | Runbook asociado                              |
|--------------------------------|------------|----------------------|------------------------------------------------|
| **Restore de backup MySQL**    | Mensual    | Owner de backups     | [`restaurar-backup-mysql.md`](../restaurar-backup-mysql.md) |
| **Rotación de APP_KEY**         | Anual      | Tech lead            | [`rotar-app-key.md`](../rotar-app-key.md)       |
| **Failover / recuperación de servicio** | Semestral | On-call rotation | [`php-fpm-crash.md`](../php-fpm-crash.md)       |
| **Recuperación de disco lleno** | Anual      | On-call rotation     | [`bd-llena.md`](../bd-llena.md)                 |
| **Tabletop de incident response** | Trimestral | Equipo entero | [`../../security/incident-response.md`](../../security/incident-response.md) (cuando exista) |

## Convención de nombre

```
YYYY-MM-<tipo-drill>.md
```

Ejemplos:
- `2026-07-restore-mysql.md`
- `2026-Q3-tabletop-data-breach.md`

## Cómo correr un drill

### Restore drill (mensual — primer lunes del mes)

1. **No** tocar producción. Levantar entorno aislado:
   - VPS efímero, container Docker, o ambiente staging.
2. Bajar el backup más reciente del bucket B2.
3. Validar sha256 contra el manifest.
4. Restaurar (medir tiempo).
5. Validaciones funcionales:
   - `SELECT COUNT(*) FROM pedidos` debe coincidir con el manifest.
   - `php artisan migrate:status` esperado.
   - Login con un usuario de prueba.
   - Endpoint público responde.
6. Llenar el archivo `docs/runbook/drills/YYYY-MM-restore-mysql.md` con resultados.
7. Si **algo** falló, abrir issue inmediato — **es** un incidente latente.

### Tabletop drill (trimestral)

Discusión hipotética sin tocar nada real:

1. Facilitador presenta un escenario (ej. "Un dump de la BD apareció en pastebin pública").
2. Equipo describe paso a paso qué haría — siguiendo runbooks reales.
3. Identifica gaps en los runbooks o en la preparación.
4. Documenta el drill con findings + action items.

## Drills realizados

_Vacío — al primer drill, listarlo aquí en orden cronológico inverso._

## Criterios de "drill exitoso"

✅ Procedimiento completado de principio a fin sin saltarse pasos.
✅ Tiempo total ≤ objetivo del SLO (ver runbook respectivo).
✅ Sin necesidad de improvisar (si hubo que improvisar → action item: actualizar runbook).
✅ Documentado al cierre.

## Anti-patrones

- ❌ "Le hicimos drill el año pasado" — los drills caducan en 6-12 meses.
- ❌ "Confiamos que funciona" — sin drill, es ficción.
- ❌ Hacerlo solo y "checkear con la memoria" — debe involucrar a alguien que no conozca el sistema, para validar que los runbooks son seguibles por un newcomer.
- ❌ Aprobar el drill aunque saltamos pasos — disciplina total o no sirve.

## Próximos drills agendados

_Pendiente: definir calendario una vez que el primer backup automatizado esté corriendo._
