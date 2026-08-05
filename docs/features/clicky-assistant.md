# Feature — Clicky, asistente de IA del panel (F103)

> **Estado**: en producción. Gateado por feature key `clicky_assistant`
> (Profesional $299 y Premium $499 — bloqueado en Esencial $99).

## Qué es

Clicky es la mascota/asistente que vive en el panel de admin (owner + staff,
no super_admin). Ayuda al usuario con dudas de "cómo hago X" y "dónde pulso"
sin necesidad de contactar soporte. Combina dos capas, a propósito
independientes entre sí:

1. **Guía scripteada (gratis, 100% confiable)** — un set de "dudas comunes"
   (`apps/web/src/components/clicky/clickyFaq.ts`) que disparan los tours
   interactivos ya existentes en `components/help/tours.ts` vía
   `useHelpCenter().openTour(slug)`. Esto reutiliza el spotlight real
   (`TourOverlay`) que ya resalta el botón exacto en el DOM — Clicky **no
   inventa** dónde pulsar, apunta a un selector `data-tour="..."` real.
2. **Chat libre con Gemini (fallback)** — para preguntas que no calzan en
   el guion, el frontend llama a `POST /api/v1/clicky/ask` con el mensaje y
   la ruta actual (`pathname`). El backend responde en texto corto, en
   español, con un system prompt que lo restringe a temas de "cómo usar
   ClickToEat" (ver `App\Http\Controllers\Api\Admin\ClickyController`).

La capa 1 cubre la mayoría de las dudas de onboarding sin gastar un solo
token. La capa 2 sólo se usa cuando el dueño escribe algo libre.

## Por qué NO es un tour nuevo desde cero

Antes de construir esto se auditó el sistema existente
(`components/help/TourOverlay.tsx`, `AutoTourTrigger.tsx`,
`store/helpCenter.ts`) y ya cubre spotlight con highlight + halo pulsante +
tooltip posicionado, con 14 tours cargados (bienvenida, productos,
categorías, pedidos, inventario, compras, branding, qr, horarios, staff,
métricas, billing, reviews, sucursales). Clicky es una capa de
descubribilidad/conversación sobre ese motor, no un reemplazo. También existe
`centro_aprendizaje` (lecciones animadas estáticas, disponible desde
Esencial) — es un módulo de contenido pasivo, distinto de Clicky (que es
interactivo y conversacional).

## Arquitectura

### Backend

- `App\Support\Features::CLICKY_ASSISTANT` = `'clicky_assistant'` — incluida
  en `professional` y `premium` en `PlansSeeder.php` (y en `PlanFactory`
  para tests). **No** está en `essential`.
- `POST /api/v1/clicky/ask` (dentro del grupo `auth:sanctum,tenant`) —
  middleware `feature:clicky_assistant` (402 `FEATURE_LOCKED` si no aplica,
  mismo patrón que el resto del gating) + `throttle:clicky` (40
  peticiones/día **por local**, no por usuario — ver
  `RateLimiter::for('clicky', ...)` en `AppServiceProvider`).
- `App\Http\Requests\AskClickyRequest` — valida `message` (string, máx 400)
  y `pathname` opcional.
- `App\Http\Controllers\Api\Admin\ClickyController@ask` — arma un system
  prompt fijo (restringe el tema, tono, evita alucinar features/datos del
  negocio del usuario) y llama a `App\Services\AI\LLMClient` con
  `provider = 'gemini'` explícito (independiente del `AI_PROVIDER` genérico
  usado por las otras features de IA planeadas, ver
  [`ia-features.md`](./ia-features.md)).
- `LLMClient::gemini()` — llama a
  `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.
  Si la llamada falla (red, 4xx, 5xx, cuota) cae a una respuesta mock
  genérica — **el endpoint nunca revienta la UI**, solo degrada la calidad
  de la respuesta.

### Config

```env
# apps/api/.env — NO se commitea (gitignored)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-lite   # el más barato/rápido del catálogo Gemini
```

Sin `GEMINI_API_KEY`, el endpoint responde con un mock plausible (igual que
el resto de `LLMClient`) — útil para tests/CI sin gastar tokens.

⚠️ **Verificado en dev (2026-08-05)**: la key entregada llega correctamente
a la API de Gemini (auth y payload válidos) pero devolvió `429 — quota
exceeded` en la cuenta de Google asociada. El fallback a mock absorbió el
error sin romper nada. Si en producción Clicky responde siempre con el
texto mock genérico, revisar cuota/billing del proyecto de Google Cloud
dueño de `GEMINI_API_KEY` en https://aistudio.google.com o Google Cloud
Console — no es un bug del código.

### Frontend

- `components/clicky/ClickyMascot.tsx` — mascota pixel-art (8-bit) dibujada
  como grilla CSS (sin imágenes ni SVG suavizado): cuerpo de cursor con
  colita, 2 tonos planos, ojos que parpadean solos (intervalo aleatorio
  por ojo, look "chunky" sin easing suave — consistente con el estilo
  retro). Estado `locked` = paleta gris + candado.
- `components/clicky/ClickyWidget.tsx` — botón flotante (`bottom-6 right-5`,
  z-70) + panel de chat. Usa `usePlan(s => s.has(Features.CLICKY_ASSISTANT))`
  para decidir entre chat funcional o card de upsell (mismo patrón que
  `LockedFeature`/`UpgradeCard` en `components/billing/`). Si el plan no
  tiene la feature, el click abre un upsell con link a `/admin/billing` en
  vez de abrir el chat.
- `components/clicky/clickyFaq.ts` — catálogo de preguntas rápidas →
  `tourSlug`. Agregar una pregunta nueva acá es la forma correcta de
  extender la cobertura de Clicky sin tocar el backend.
- Montado en `app/admin/layout.tsx`, junto a `TourOverlay`/`AutoTourTrigger`,
  sólo para `user.rol !== 'super_admin'`.
- `store/plan.ts` — `Features.CLICKY_ASSISTANT` agregado al espejo TS de
  `App\Support\Features`.

## Cómo agregar una duda nueva

1. Si ya existe un tour para el módulo en `components/help/tours.ts`, sólo
   agrega una entrada en `CLICKY_QUICK_ACTIONS`
   (`components/clicky/clickyFaq.ts`) con `question`, `reply` corto y el
   `tourSlug` existente.
2. Si el módulo no tiene tour todavía, créalo primero en `tours.ts` (pega
   `data-tour="..."` en los elementos relevantes de la página) y después
   agrega la quick action.
3. Preguntas que no calzan en ningún tour quedan cubiertas por el fallback
   de Gemini — no requieren cambio de código.

## Límites conocidos / pendiente

- El chat libre no tiene memoria entre preguntas (cada mensaje se envía
  solo, sin historial) — mantiene el prompt corto y barato.
- Rate limit de 40/día es por local (no por usuario) — un local con varios
  miembros de staff comparte el cupo.
- No hay botón para que Clicky "señale" un elemento a partir de una
  respuesta libre de Gemini — a propósito: eso implicaría confiar en que el
  LLM no alucine un selector inexistente. El spotlight real sólo lo dispara
  la capa 1 (scripteada).

## Ver también

- [`feature-gating.md`](./feature-gating.md) — catálogo completo de features
- [`ia-features.md`](./ia-features.md) — otras iniciativas de IA del proyecto
- `components/help/tours.ts` — catálogo de tours reutilizado por Clicky
