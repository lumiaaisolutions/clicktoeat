# ADR-001: Multi-tenancy con scope por columna en una sola base de datos

> **Status:** aceptada
> **Fecha:** 2026-06-10 (decisión histórica, documentada hoy)
> **Decisores:** equipo inicial

## Contexto

ClickToEat hostea muchos locales (tenants) en la misma instalación. Cada local tiene su propio catálogo, pedidos, inventario, branding. Necesitamos garantizar que un local **nunca** vea datos de otro.

Las opciones clásicas para multi-tenancy en SaaS son:

- **DB-per-tenant** (cada local en su propio MySQL).
- **Schema-per-tenant** (un MySQL, un schema por local).
- **Row-level / scope por columna** (un MySQL, una BD, columna `local_id` en cada tabla).

## Decisión

Usamos **scope por columna**: una sola BD MySQL, columna `local_id` en cada tabla de negocio, con `GlobalScope` automático aplicado por un trait `BelongsToTenant`. El `local_id` activo se resuelve por middleware (`EnforceTenantScope`) y se guarda en un singleton `TenantContext`.

`super_admin` bypassea el scope (no setea TenantContext).

## Alternativas consideradas

- **DB-per-tenant** → descartada. Operacionalmente costosa (N migraciones por release, N backups, N connection pools). Solo justificable a partir de tenants con datasets enormes o requisitos de aislamiento físico legales.
- **Schema-per-tenant** → descartada por motivos similares; agrega complejidad de `USE <schema>` por request sin un beneficio claro frente al scope.
- **Sin scope automático, filtrar manualmente en cada query** → descartada. Un olvido = filtración. El GlobalScope es la red de seguridad.

## Consecuencias

### Positivas

- Una sola migración aplica a todos.
- Un solo dump basta para backup.
- Onboarding de un nuevo local = un `INSERT` en `locales`, no provisioning de infra.
- `JOIN` cross-tenant (para super_admin) es trivial.

### Negativas

- **Riesgo de filtración** si alguien usa `DB::table(...)` (salta scope) o `withoutGlobalScopes()` sin `where('local_id', ...)` explícito.
- **Sin aislamiento físico** — un performance hit de un tenant grande puede afectar a otros (mismo storage, mismo CPU).
- **`Crypt` o backups por tenant** son complicados (los datos están mezclados a nivel de fila).
- Escalabilidad eventual requiere sharding por `local_id`, no trivial.

### Neutras

- `TenantContext` debe ser **singleton** del contenedor — sin singleton el middleware y el scope leen instancias distintas y el filtro queda inerte. Está enforced en `AppServiceProvider::register`.
- Documentado en [`docs/architecture/multi-tenancy.md`](../architecture/multi-tenancy.md).

## Anti-patrones a evitar

- ❌ `DB::table('productos')` (salta el scope) sin condicionar `local_id`.
- ❌ `withoutTenantScope()` sin un `where('local_id', $id)` explícito.
- ❌ Crear modelos nuevos con columna `local_id` sin aplicar el trait `BelongsToTenant`.

## Cuándo reabrir esta decisión

- Si llegamos a >10k locales activos (escalabilidad de queries).
- Si aparece un requisito legal de aislamiento físico (GDPR / similar para un mercado específico).
- Si necesitamos backups granulares por tenant (export + delete on demand).
