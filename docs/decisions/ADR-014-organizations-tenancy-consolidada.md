# ADR-014 — Sucursales consolidadas (`organizations`) sin tocar el TenantScope

> **Estado:** aceptada.
> **Fecha:** 2026-07-14.
> **Decisor:** Owner del proyecto (confirmado alcance "sucursales reales consolidadas" en ADR-012 decisión #5).
> **Depende de:** [ADR-001](ADR-001-single-db-tenancy.md) (single-db tenancy — este ADR la EXTIENDE, no la reemplaza), [ADR-012](ADR-012-plan-499-operacion-de-salon-dine-in.md).

## Contexto

ADR-012 (decisión #5) confirmó que el plan Premium necesita sucursales consolidadas reales — un dueño con varias ubicaciones puede ver catálogo/inventario/reportes combinados de todas ellas, no sólo cambiar de cuenta entre Locales independientes (eso ya existe: `LocalSwitcher`, F71).

**El riesgo central**: ADR-001 estableció como invariante que "un tenant = un `Local` aislado", y CLAUDE.md lo marca como regla crítica no negociable (`TenantScope` filtra TODO por `local_id`; nunca se debe bypassear sin un `where('local_id', ...)` explícito). Cualquier feature que combine datos de varios Locales tiene que hacerlo sin debilitar esa garantía para el resto del sistema.

## Decisión

Se agrega un concepto de **organización** por ENCIMA de `Local`, sin tocar `TenantScope`/`BelongsToTenant`:

1. Tabla nueva `organizations` (`id`, `nombre`, `owner_user_id`).
2. `locales.organization_id` (nullable). Un `Local` sin organización sigue siendo 100% independiente — comportamiento actual sin cambios para el 99% de los locales que no la usan.
3. **Ningún modelo existente cambia su global scope.** Todo lo que hoy filtra por `local_id` (productos, pedidos, inventario, staff, mesas, cuentas) lo sigue haciendo exactamente igual.
4. La vista consolidada se sirve **exclusivamente** desde `App\Services\Organizations\OrganizationReportService`, que:
   - Resuelve los `local_id` que pertenecen a la organización del usuario autenticado con una query explícita (`Local::where('organization_id', $orgId)->pluck('id')`), nunca confiando en el scope global.
   - Usa el escape hatch **ya existente** en el codebase — `Model::withoutTenantScope()->whereIn('local_id', $idsVerificados)` (mismo patrón que `OrderService.php:47`) — nunca `withoutGlobalScopes()` a secas.
   - Es de **solo lectura en v1** — no hay escritura cruzada entre Locales de una organización (evita que una acción en un Local mute datos de otro).
5. Autorización: sólo el `owner` de un `Local` cuyo `organization_id` coincide puede leer el reporte consolidado de esa organización — verificado explícitamente en la policy, no inferido del scope.

## Alternativas consideradas

- **Redefinir `TenantScope` para aceptar una lista de `local_id`s de la organización**: rechazado — es el cambio de mayor riesgo posible, porque CUALQUIER bug ahí filtra datos entre locales de dueños distintos en TODO el sistema, no sólo en reportes. El costo de aislar el riesgo a un servicio nuevo (`OrganizationReportService`) es mínimo comparado con ese blast radius.
- **Modelo `organizations` como nuevo tenant raíz (reemplazando `Local` como unidad de aislamiento)**: rechazado — requeriría migrar TODOS los modelos tenant-scoped y reescribir `TenantScope`; además la inmensa mayoría de locales de ClickToEat son de una sola ubicación y no necesitan esto. Sobre-ingeniería para el caso común.
- **Vista de BD (SQL VIEW) que une varios locales**: rechazado — Hostinger managed MySQL no da `SUPER`/`RELOAD`, complica migraciones, y no resuelve autorización (seguiría necesitando la misma verificación explícita en capa de aplicación).

## Consecuencias

### Positivas

- Cero cambio de riesgo para los locales que NO usan sucursales consolidadas (inmensa mayoría) — el scope global ni se toca.
- El único código nuevo que cruza locales vive en un servicio aislado y explícito, fácil de auditar/testear en un solo lugar.
- Reutiliza un patrón (`withoutTenantScope()` + `whereIn` explícito) que el equipo ya usa y entiende (`OrderService`).

### Negativas

- v1 es sólo lectura — el owner no puede, por ejemplo, mover inventario entre sucursales desde el reporte consolidado todavía (fast-follow si se pide).
- Un owner con Locales en más de una organización (caso raro) no está contemplado en v1 — se asume 1 Local pertenece a máximo 1 organización.

### Neutras

- Nueva tabla `organizations`, nueva columna `locales.organization_id`, nuevo servicio + policy + endpoint de sólo lectura.

## Referencias

- [ADR-001 — Single DB tenancy](ADR-001-single-db-tenancy.md)
- [ADR-012 §5 y Riesgo agravado](ADR-012-plan-499-operacion-de-salon-dine-in.md)
- [`plan-499-operacion-salon-implementacion.md` §3.12](../features/plan-499-operacion-salon-implementacion.md)
