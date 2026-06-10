# ADR-NNN: Título corto y declarativo

> **Status:** propuesta | aceptada | superseded por ADR-XXX
> **Fecha:** YYYY-MM-DD
> **Decisores:** @nombre1, @nombre2

## Contexto

¿Por qué necesitamos tomar esta decisión? Qué problema resuelve, qué restricciones existen, qué señales nos llevaron a discutirlo. 2-4 párrafos máximo.

## Decisión

Lo que se decidió, en presente afirmativo. "Usamos X" — no "vamos a usar X".

## Alternativas consideradas

Para cada una, una línea de qué es + por qué se descartó.

- **A**: descripción → razón de descarte.
- **B**: descripción → razón de descarte.

## Consecuencias

### Positivas

- Lo que mejora.

### Negativas

- Lo que empeora o limita.

### Neutras

- Cambios necesarios para hacer efectiva la decisión.

## Cómo usar este template

1. Copia este archivo a `docs/decisions/ADR-<NNN>-titulo-en-slug.md` (NNN = incrementar).
2. Completa los campos.
3. Linkea desde el(los) doc(s) afectados.
4. Si una decisión la reemplaza, marca esta como `superseded por ADR-MMM`.

## Cuándo escribir un ADR (no para todo)

Sí escribirlo cuando:
- La decisión es costosa de revertir (afecta esquema BD, arquitectura, librerías centrales).
- Hay alternativas razonables y queremos dejar rastro de por qué descartamos.
- Cambia un patrón establecido del repo.
- Lo va a heredar alguien que llegue después.

No escribirlo cuando:
- Es un detalle de implementación local (nombre de variable, ordenar campos).
- Una librería que se usa una vez en un módulo aislado.
- Algo trivialmente reversible.

## Ejemplos a considerar para escribir (todavía pendientes)

- ADR-001: Single database con scope por columna vs schema-per-tenant.
- ADR-002: Bearer tokens Sanctum vs SPA stateful.
- ADR-003: Snake_case interno vs camelCase público.
- ADR-004: Inventory + Order como services con transacciones explícitas.
- ADR-005: Snapshot en `detalle_pedidos`.
- ADR-006: Recetas con XOR ingrediente/componente (productos compuestos).
- ADR-007: Uploads locales vs Cloudinary (a decidir).
- ADR-008: Polling 30s vs Reverb/SSE para notificaciones (a decidir).
