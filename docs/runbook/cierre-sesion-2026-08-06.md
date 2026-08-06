# Cierre de sesión — 2026-08-06

## Qué se hizo

### F103 — Clicky, asistente de IA del panel

Feature completa de principio a fin: diseño, backend, frontend, tours interactivos, incidente de producción resuelto en el camino, y dos rondas de ajuste de diseño post-feedback. Detalle técnico completo en [`docs/features/clicky-assistant.md`](../features/clicky-assistant.md) — este documento es la bitácora cronológica de la sesión.

**Qué es**: mascota flotante (cursor de mouse pixel-art 8-bit con ojos que parpadean) en el panel admin, gateada por plan (`clicky_assistant` — Profesional $299 y Premium $499, bloqueada en Esencial $99 con upsell). Combina:
1. Preguntas rápidas que **navegan de verdad al módulo** (`router.push`) y abren un tour interactivo existente con spotlight real, dejando el botón resaltado clickeable de verdad (el overlay recorta el backdrop en vez de taparlo) — clickear el botón real abre el modal y avanza el tour solo.
2. Chat libre de fallback contra **Gemini** (`gemini-2.0-flash-lite`) para preguntas que no calzan en el guion, con system prompt que restringe el tema a "cómo usar ClickToEat".

**Iteraciones de diseño del mascot** (3 rondas, cada una con verificación visual antes de deployar):
1. Grilla pixel-art 15x11 dibujada a mano → ojos ilegibles a tamaño de botón.
2. Grilla pixel-art 9x9 más gruesa → se leía como blob/bota, no como cursor.
3. **Final**: path SVG de cursor de mouse (flecha + colita) verificado visualmente con `chrome --headless --screenshot`, luego rasterizado a PNG 28x28 y embebido en base64 con `imageRendering: pixelated` — silueta de cursor inequívoca + estética 8-bit real. Este es el que quedó en producción.

**Tours profundizados** — de 1-2 pasos genéricos a 8-15 pasos que caminan el flujo completo: `productos`, `categorias`, `pedidos`, `inventario`, `staff` (interactivos, con click-through real) y `qr`, `branding`, `billing` (narración profunda, sin click-through porque su acción principal navega fuera de la app — Stripe, imprimir, descargar). Se agregaron ~50 atributos `data-tour` nuevos y se corrigieron dos selectores de `branding` que el tour ya referenciaba pero no existían en el DOM (rotos desde antes de esta sesión).

**Bugs encontrados y corregidos tras feedback del usuario probando en producción**:
- El fallback de Clicky mostraba el mensaje mock genérico de `LLMClient` ("Configura ANTHROPIC_API_KEY...") — un detalle interno que no debía llegarle a un usuario real. Fix: `opts['fallback']` propio en `ClickyController`, cubierto por test.
- Las dudas rápidas no navegaban al módulo — si el usuario preguntaba desde `/admin` (o cualquier pantalla que no fuera la del tour), el tour buscaba `data-tour` que no existían ahí y se veía roto/centrado. Fix: `ClickyWidget` navega primero, luego espera a que la ruta coincida antes de abrir el tour.

**Pendiente, fuera de mi control**: la API key de Gemini sigue devolviendo `429 — quota exceeded` (verificado en logs de prod hasta el 2026-08-06 09:04). El usuario necesita revisar billing/cuota en Google Cloud Console — el fallback absorbe el error sin romper la UI, pero el chat libre no va a responder con IA real hasta que se resuelva del lado de Google.

### Incidente de producción — 503 intermitente + SSH cortado

Postmortem completo: [`docs/runbook/postmortems/2026-08-06-hosting-resource-limit-503.md`](postmortems/2026-08-06-hosting-resource-limit-503.md).

Resumen: el plan **Business Web Hosting** de Hostinger (13 sitios compartiendo CPU/procesos, no solo ClickToEat) llegó al 100% de su cuota de recursos tras varios deploys + conexiones SSH consecutivas en la sesión. Síntoma: API en 503 intermitente, SSH autenticaba pero cortaba la sesión al instante. Se perdió tiempo diagnosticando un VPS de la misma cuenta de Hostinger que **no tiene relación con ClickToEat** (proyecto distinto, "lumia-prod"). Se resolvió activando el "Resource Boost" gratuito de Hostinger (1x/mes, 24h de 5x CPU). Lección clave documentada en el postmortem para no repetir la confusión de VPS.

## Archivos tocados hoy (ClickToEat)

**Backend**: `Features.php`, `PlansSeeder.php`, `PlanFactory.php`, `AppServiceProvider.php` (rate limiter), `LLMClient.php` (provider Gemini + `opts['fallback']`), `ClickyController.php` (nuevo), `AskClickyRequest.php` (nuevo), `routes/api.php`, `tests/Feature/Clicky/ClickyGatingTest.php` (nuevo).

**Frontend**: `components/clicky/` (nuevo: `ClickyMascot.tsx`, `ClickyWidget.tsx`, `clickyFaq.ts`), `components/help/tours.ts` (tours profundizados), `components/help/TourOverlay.tsx` (backdrop recortado + click-through), `components/ui/FormField.tsx` (`Switch` acepta `data-tour`), `components/admin/BrandingEditor.tsx` (`Section` acepta `data-tour`), `app/admin/{productos,categorias,pedidos,inventario,qr,staff,billing}/page.tsx` (atributos `data-tour`), `app/admin/layout.tsx` (monta `ClickyWidget`), `store/plan.ts` (`Features.CLICKY_ASSISTANT`).

**Docs**: `docs/features/clicky-assistant.md` (nuevo), `docs/features/feature-gating.md`, `docs/features/ia-features.md`, `docs/api/tenant.md`, `docs/api/rate-limits.md`, `docs/runbook/postmortems/2026-08-06-hosting-resource-limit-503.md` (nuevo), este archivo.

## Estado final

Todo desplegado y verificado en producción (bundle real inspeccionado tras cada deploy). API y web sanas, con el Resource Boost activo hasta ~2026-08-07 14:44.

## Pendiente — próximas sesiones

1. **Arreglar la cuota de Gemini** (Google Cloud Console / AI Studio) — sin esto el chat libre de Clicky nunca responde con IA real, solo con el fallback genérico.
2. **Monitoreo de `/up`** — no hubo alerta automática del incidente de hoy, se detectó porque el owner reportó "no aparece ningún registro". Considerar UptimeRobot u otro servicio gratuito.
3. **Aclarar en `docs/infra/deploy-hostinger.md`** que ClickToEat vive en Business Web Hosting (hPanel → Websites), no en el VPS 1698236 de la misma cuenta — para no repetir la confusión de hoy.
4. **Evaluar plan de hosting con más headroom** si el 503 por límite de recursos se repite — el Boost gratuito es 1x/mes, no una solución permanente.
5. Portar Clicky (asistente + tours profundizados) a **ClickToShop** (`../clicktoshop/`) — en progreso, ver su propio `docs/runbook/cierre-sesion-2026-08-06.md` cuando esté listo.
