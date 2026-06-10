# ADR-003: snake_case interno, camelCase para el menú público

> **Status:** aceptada (con compromiso de NO crecer la dualidad)
> **Fecha:** 2026-06-10 (decisión histórica, documentada hoy)
> **Decisores:** equipo inicial

## Contexto

Dos convenciones de naming conviven en las respuestas JSON de la API:

- **snake_case** (la mayoría: `PedidoResource`, `ProductoResource`, `LocalResource`, ...) — espeja columnas BD: `cliente_nombre`, `metodo_entrega`, `delivery_fee`.
- **camelCase** en `Public/MenuResource` y `MenuController::show` — `colorPrimario`, `metodosPago`, `deliveryFee`.

## Decisión

Mantenemos la dualidad **sólo en los endpoints existentes**:

- **Snake_case** para todo lo `/auth/*`, `/local/*`, `/categorias`, `/productos`, `/pedidos`, `/admin/*`, etc. (resources internos).
- **camelCase** sólo en `/public/menu/{slug}` y `/public/locales`.

**No se introducirán nuevas variaciones**. Todo endpoint nuevo usa **snake_case**.

## Alternativas consideradas

- **Unificar todo a snake_case** → preferida en teoría, descartada por costo. Implicaría tocar `LandingClient.tsx` (~31 KB) y el directorio público para renombrar todas las refs.
- **Unificar todo a camelCase** → idem; además rompe la simetría columna-JSON que facilita debug.
- **Middleware de transformación automática** (snake → camel) → descartada. Magia opaca, agrega CPU por request, dificulta grep.

## Consecuencias

### Positivas

- No hay refactor masivo.
- Cada cara (interna vs landing pública) conserva la convención que ya funciona en su frontend respectivo.

### Negativas

- Inconsistencia "perceptiva" — alguien nuevo se confunde la primera vez.
- Bug bait: si se copia un Resource interno y se reutiliza en endpoint público, hay que recordar la traducción manual.

### Neutras

- Documentado en [`docs/api/conventions.md`](../api/conventions.md).
- Si en el futuro se decide unificar, hacerlo en un solo PR con tests visuales del frontend, ya que rompe contratos.

## Cuándo reabrir

- Si se va a publicar una **API pública para terceros** (developer docs), unificar por consistencia.
- Si se introducen muchos endpoints camelCase y la dualidad deja de ser "pequeña excepción".
