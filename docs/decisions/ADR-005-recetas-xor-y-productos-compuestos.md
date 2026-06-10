# ADR-005: Recetas XOR (ingrediente OR componente) + expansión recursiva

> **Status:** aceptada
> **Fecha:** 2026-06-10 (decisión histórica)
> **Decisores:** equipo inicial

## Contexto

Un producto vendible consume cosas al ser pedido. Esas "cosas" pueden ser:

1. **Ingredientes físicos** controlados por stock (1 tortilla, 0.05 kg carne, etc.).
2. **Otros productos componentes**: ej. "Combo familiar" incluye `1× Mix de frutas`, y "Mix de frutas" es a su vez otro producto vendible con su propia receta.

Necesitamos representar ambos casos sin duplicar lógica de stock.

## Decisión

Una sola tabla `recetas` con **tres columnas relevantes**:

- `producto_id` — el producto que se vende.
- `ingrediente_id` (nullable) — el ingrediente consumido.
- `componente_producto_id` (nullable) — otro producto que actúa como subreceta.
- `cantidad` — multiplicador (decimal:3).

**Regla XOR**: una fila usa **uno** de los dos punteros (ingrediente XOR componente), nunca ambos. Enforzado por `SyncRecetaRequest` (validator), no por CHECK constraint en BD (limitación de portabilidad sqlite/mysql).

**Expansión recursiva**: `InventoryService::expandirProducto` resuelve los componentes recursivamente hasta llegar a ingredientes hoja, acumulando el multiplicador. Detecta ciclos via set `$visitados`.

## Alternativas consideradas

- **Dos tablas separadas** (`producto_ingrediente` y `producto_componente`) → descartada. Misma estructura semántica + cantidad. Dos tablas requeriría dos paths de código para descontar.
- **Polimorfismo** (`item_type` enum + `item_id` morphTo) → descartada. Más complejidad sin beneficio (sólo 2 tipos posibles).
- **Aplanar la expansión** al guardar (precomputar "este producto consume estos ingredientes finales") → descartada. Rompe la edición: cambiar la receta del componente exige re-aplanar todos los padres.

## Consecuencias

### Positivas

- **Una sola lógica** de descuento (recursivo) cubre los dos casos.
- Editar la receta del componente actualiza automáticamente a todos los padres (no hay materialización stale).
- UI puede mostrar la receta "tal como se editó" — granularidad por línea, no aplanada.

### Negativas

- **Sin CHECK constraint en BD** → si alguien hace INSERT raw con ambos campos no-NULL, MySQL acepta. **Pendiente**: añadir CHECK cuando dejemos de necesitar sqlite (o hacer el CHECK condicional al driver).
- **Detección de ciclos** depende de la implementación correcta de `expandirProducto`. Si alguien introduce un componente cíclico via SQL crudo, romperá en runtime con `RuntimeException`. Test cubre el caso.
- **Performance**: cada pedido implica N queries (una por nivel de receta) para expandir. Aceptable para los volúmenes actuales; reescribir como CTE recursivo si se vuelve cuello de botella.

### Neutras

- UNIQUE `(producto_id, ingrediente_id)` y UNIQUE `(producto_id, componente_producto_id)` evitan duplicados accidentales.
- Documentado en [`docs/features/recetas.md`](../features/recetas.md) y [`docs/features/inventario.md`](../features/inventario.md).

## Cuándo reabrir

- Si MySQL pasa a ser el único driver (sin tests en sqlite) → añadir CHECK constraint.
- Si la performance del descuento se vuelve crítica → CTE recursivo o materialización con invalidación inteligente.
