# Feature — IA features (Pro)

> **Estado**: skeleton del cliente LLM listo. Endpoints + UI pendientes.

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

## Ver también

- [`saas-billing.md`](saas-billing.md) — planes activos
- [`features/feature-gating.md`](feature-gating.md)
