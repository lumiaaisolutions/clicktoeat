# Feature — IA features (Pro)

> **Estado**: Bot de recomendaciones con n8n + Ollama **operativo en producción** (2026-06-30). Skeleton del cliente LLM interno listo. Endpoints + UI del panel pendientes.
>
> Ver también [`clicky-assistant.md`](./clicky-assistant.md) (F103) — usa el
> mismo `App\Services\AI\LLMClient` de este documento, pero con provider
> `gemini` fijo y su propia feature key `clicky_assistant`, ya en producción.

## 3 features planeadas

| Feature | Quién la dispara | Cuándo |
|---|---|---|
| **Sugerencias de precio** (`/admin/productos/{id}/ai-suggest-price`) | Owner | Manual desde card de producto. "Sugerencia: bajar X% porque ventas cayeron Y%" |
| **Predicción de demanda** (`/admin/metricas/forecast`) | Owner | Diario auto-trigger o manual. "Mañana esperamos N pedidos, prepara X" |
| **Mensaje personalizado WhatsApp** | Sistema | Al confirmar un pedido, se inyecta antes del texto pre-armado |

Todas gated por feature `ia_features` (a agregar en Features y planes).

## Cliente

`App\Services\AI\LLMClient` — provider switching:

- `AI_PROVIDER=mock` (default sin keys) — respuestas pre-armadas plausibles
- `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` — Claude Haiku 4.5
- `AI_PROVIDER=openai` + `OPENAI_API_KEY` — GPT-4o-mini

Mock mode hace que la UI esté completa sin gastar tokens — útil para
demos y CI.

## Costos estimados

Por llamada Claude Haiku 4.5 (~300 tokens out + 500 tokens in):
- $0.001 USD ≈ $0.018 MXN

Tope mensual sugerido por local Pro: **500 llamadas/mes ≈ $9 MXN de costo**.
Pago dentro del SaaS sin cobro extra.

## Config

```env
# Default: mock (no costo)
AI_PROVIDER=mock

# Para activar real:
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

`config/services.php`:
```php
'ai' => [
  'provider' => env('AI_PROVIDER', 'mock'),
  'api_key'  => env('ANTHROPIC_API_KEY') ?: env('OPENAI_API_KEY'),
],
```

## Pendiente

- 3 endpoints + controllers
- UI cards en /admin/productos (botón "Sugerencias IA")
- /admin/metricas tab "Pronóstico"
- Hook en `OrderService::crear` para mensaje personalizado WhatsApp
- Rate limit por local (50/día)
- Audit log de cada sugerencia (auditable + lo que pagamos)
- Feature key `ia_features` en `Features` + flag en Professional/Business

## Bot de recomendaciones — n8n + Ollama (operativo 2026-06-30)

Implementación paralela al cliente LLM de Laravel. Corre en n8n con Ollama local — sin costo por token.

### Stack

- **n8n** en `2.24.123.93:5678` — orquestación del workflow
- **Ollama** — modelo LLM local (sin costo)
- **MySQL** remoto via `srv943.hstgr.io` — consulta directa a la BD de prod

### Webhook

```
POST http://2.24.123.93:5678/webhook/3ad747d0-ccd1-4af3-bca1-4ab0f93b924f
{ "session_id": "...", "local_slug": "postres-stitch", "cliente_telefono": "7222695572" }
```

### Flujo de nodos

```
Webhook → Execute a SQL query (contexto cliente+local)
        → Execute a SQL query1 (catálogo del local)
        → Edit Fields
        → Basic LLM Chain [Execute Once] → Ollama Model
```

### Identificadores de BD

| Campo POST | Mapea a |
|---|---|
| `local_slug` | `locales.slug` |
| `cliente_telefono` | `pedidos.cliente_telefono` |

No hay tabla `clientes` — el teléfono es el único identificador de cliente.

### Resultado verificado

Con `postres-stitch` + `7222695572` (Denisse): bot reconoció a la cliente por nombre, citó sus favoritos (Fresas con Crema y Nutella, Pay de limón), recomendó 3 productos del menú, mostró catálogo completo. ~650 tokens, ~20s.

### Pendiente

- Flujo de registro del pedido: IF → Code (parse JSON) → HTTP Request → API Laravel
- Chat widget React en `/{slug}`: `apps/web/src/components/public/ChatBot.tsx`
- Prompt debe incluir `producto_id` en SALIDA FINAL para que la API lo acepte

Detalle completo: [`docs/runbook/cierre-sesion-2026-06-30.md`](../runbook/cierre-sesion-2026-06-30.md)

## Ver también

- [`saas-billing.md`](saas-billing.md) — planes activos
- [`features/feature-gating.md`](feature-gating.md)
