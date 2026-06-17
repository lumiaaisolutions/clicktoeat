# Sidebar, referidos, branding y ticket — 2026-06-17 (tarde 4)

Continuación de `ticket-branding-link-calif-2026-06-17c.md`. 6 fases.

## Fase A — Sidebar admin con subsecciones

Sidebar plano de 18 items → ahora organizado en bloques con headers
estilo "OPERACIÓN", "CATÁLOGO", "CLIENTES", "CONFIGURACIÓN", "CUENTA",
"AYUDA". Más rápido localizar opciones.

### Implementación

`apps/web/src/app/admin/layout.tsx`:

- Nuevo tipo `NavSection { section: string }` y union `NavEntry = NavItem | NavSection`.
- `NAV_OWNER` y `NAV_SUPER` ahora intercalan headers y links.
- `NavLinks` renderiza headers como `<div>` no-clickable de 10px uppercase,
  con tracking 0.14em y color muted/80.
- `collapseEmptySections()` quita los headers cuyo bloque quedó vacío (por
  permisos de staff o features no incluidas en el plan). Sin esto, un
  staff con permisos limitados vería headers huérfanos sin items debajo.

### Agrupación final (owner)

| Sección | Items |
|---|---|
| _(sin header)_ | Inicio |
| **Operación** | Venta, Pedidos, Reportes |
| **Catálogo** | Productos, Categorías, Inventario, Compras |
| **Clientes** | Cupones, Calificaciones, Referidos |
| **Configuración** | Horarios, QR, Branding, Equipo |
| **Cuenta** | Suscripción, Historial |
| **Ayuda** | Aprende a usar, Centro de ayuda |

## Fase B — Referidos: URL real + flujo completo

### Síntoma

El link de referidos mostraba `http://localhost:3000/?ref=LA7ST7XT` en
producción (Image #287). Causa: el backend usa
`env('APP_URL_FRONTEND', 'http://localhost:3000')` y la variable nunca se
configuró en el `.env` de Hostinger.

Además, el flujo de captura del `?ref=CODE` al registrarse no estaba
implementado en el frontend: el código jamás llegaba al endpoint
`/onboarding/local` (que sí lo acepta), así que ningún referido se
registraba ni daba descuento.

### Fix 1 — Link en frontend (sin depender del env del backend)

`apps/web/src/app/admin/referidos/page.tsx` ya no usa `d.share_url` ni
`d.mensaje_whatsapp` del backend. En su lugar:

```ts
const origin = process.env.NEXT_PUBLIC_FRONTEND_URL ?? window.location.origin;
const shareUrl = `${origin}/?ref=${d.codigo}`;
const mensajeWhatsapp = `... ${shareUrl}`;
```

Robusto: siempre apunta al dominio real desde donde el owner abrió el
panel.

### Fix 2 — Captura del `?ref=` y propagación al onboarding

Nuevo componente `apps/web/src/components/referral/RefCapture.tsx`:

- Se monta global en el `RootLayout`.
- Al hacer mount, lee `?ref=` del URL.
- Lo persiste en `localStorage` con timestamp (`{code, savedAt}`).
- TTL de 60 días — si el dueño tarda semanas en decidirse a registrarse,
  el descuento sigue vigente.
- Helpers `readStoredRefCode()` y `clearStoredRefCode()`.

`apps/web/src/app/onboarding/OnboardingClient.tsx`:

- En `buildPayloadForStep('local', d)` ahora se lee `readStoredRefCode()`
  y se incluye `codigo_referido` en el POST.
- Al finalizar el onboarding (`finalize()`), se llama `clearStoredRefCode()`
  para no aplicar el descuento dos veces si el owner se registra otra
  cuenta más tarde.

El backend ya tenía la lógica (F36 — crear `Referral` pending si el
código existe y NO es el propio local). Solo faltaba conectarlo.

## Fase C — Branding: quitar plantillas + color picker UX

### Fix 1 — Plantillas eliminadas

`apps/web/src/components/admin/BrandingEditor.tsx`: la sección
"Plantillas" duplicaba lo que ya hacen las **Paletas sugeridas** (sin
tipografía, sí, pero esa se elige aparte). Doble UI confunde. Se eliminó
el bloque completo + el array `LANDING_TEMPLATES`.

### Fix 2 — Color picker

El `<input type="color">` nativo abre un popup posicionado por el
navegador. En Safari de macOS aparece a la izquierda del elemento, lo
que en una pantalla angosta lo manda fuera de la vista. En mobile sale
en bottom-sheet pero el botón anterior era 100% width y el popup no se
podía cerrar fácil.

**Nuevo diseño del `ColorField`**:

1. Botón visual grande del color (touch target).
2. **Input nativo visible** debajo (mini-swatch) — ancla el popup nativo
   justo debajo, no a lo loco. En mobile Safari/Chrome esto fuerza el
   picker a salir en sheet centrado.
3. **Input de texto hex** siempre visible al pie (`#FF2D2D`). Permite
   pegar códigos exactos sin tocar el picker visual. Fallback total si
   el nativo falla en algún browser.

Hint actualizado en la `Section`: "Toca cualquier cuadro de color para
elegir el tuyo o escribe el código hex." — guía explícita.

## Fase D — Modal "Link de calificación" overflow

El modal mostraba scrollbar horizontal porque el `<details>` con la
vista previa del mensaje contenía una URL larga que NO se rompía
correctamente. La clase `whitespace-pre-wrap` respeta saltos de línea
del texto pero NO rompe palabras largas.

Fix en `apps/web/src/app/admin/pedidos/page.tsx`:

- Wrapper raíz: `min-w-0 max-w-full overflow-hidden`.
- Caja del link: `overflow-hidden` + `break-all` ya estaban.
- Mensaje del `<details>`: agregado `style={{ overflowWrap: 'anywhere',
  wordBreak: 'break-word' }}` además de `break-words`. Cubre todos los
  browsers (Safari interpreta `anywhere` distinto a Chrome).

## Fase E — Ticket: logo, hoja única, producto cortado

3 bugs reportados, los 3 con root cause distinto.

### Fix 1 — Logo no aparece (placeholder broken)

El `<img>` con `crossOrigin="anonymous"` falla si el server NO envía
`Access-Control-Allow-Origin`. LiteSpeed sirve `/storage/uploads/...`
directo sin headers CORS → la imagen no carga → browser muestra el
icono de imagen rota.

**Fix doble**:

1. **Backend** — `apps/api/public/.htaccess` ahora envía CORS para
   archivos estáticos:
   ```apache
   <FilesMatch "\.(jpe?g|png|gif|webp|svg|ico)$">
     Header set Access-Control-Allow-Origin "*"
     Header set Cross-Origin-Resource-Policy "cross-origin"
   </FilesMatch>
   ```
2. **Frontend** — `TicketModal` ahora **pre-carga el logo a data URL**
   via `fetch` + `blob` + `FileReader`. La data URL bypasea cualquier
   issue de CORS futuro y permite que `html2canvas` capture el logo sin
   tainted canvas. Si el fetch falla, el ticket se muestra sin logo
   (degradación grácil).

### Fix 2 — Impresión sale en 2 hojas (US Letter)

Aunque `globals.css` tiene `@page ticket { size: 80mm auto }` con
`#ticket-print { page: ticket }`, Safari ignora los named pages en
ciertos casos y termina paginando el ticket en hojas US Letter completas.

**Fix**: el botón "Imprimir" ahora **inyecta dinámicamente** un `<style>`
sin nombre:

```js
style.textContent = '@page { size: 80mm auto; margin: 3mm; }';
window.print();
setTimeout(() => style.remove(), 1500);
```

`@page` sin nombre es la regla global más fuerte y Safari la respeta.
Tras imprimir, se remueve el style para no afectar otras impresiones
(QR, reportes futuros).

### Fix 3 — Producto cortado, `<hr>` cruzando el texto

El HTML usaba clases Tailwind como `border-dashed my-2` mezcladas con
`<hr>`. html2canvas puede tener problemas calculando margins/borders
con Tailwind shortcuts.

**Fix**: reescribí el ticket con **estilos inline puros** (`style={{...}}`)
sin clases Tailwind para los elementos críticos. Cada `<div>` tiene
`padding`, `border-top`, `display: flex` explícitos. Los divs de
detalles tienen `padding: 3px 0` y la línea separadora es un
`<div style={{borderTop: '1px dashed #888'}}>` con `marginTop/marginBottom`
en lugar de un `<hr>`. Sin ambigüedad → html2canvas renderiza igual a
como se ve en pantalla.

Bonus: el texto del producto ahora tiene `wordBreak: 'break-word'` y
`minWidth: 0` así nombres largos se rompen en lugar de empujar el
precio fuera de cuadro.

## Archivos tocados

```
apps/api/public/.htaccess                                # CORS headers
apps/web/src/app/admin/layout.tsx                        # sidebar secciones
apps/web/src/app/admin/pedidos/page.tsx                  # modal overflow
apps/web/src/app/admin/punto-venta/page.tsx              # ticket rewrite
apps/web/src/app/admin/referidos/page.tsx                # share_url cliente
apps/web/src/app/layout.tsx                              # +RefCapture
apps/web/src/app/onboarding/OnboardingClient.tsx         # propaga ref code
apps/web/src/components/admin/BrandingEditor.tsx         # quitar plantillas + hex input
apps/web/src/components/referral/RefCapture.tsx          # nuevo (captura ?ref=)
```

## Verificación

- ✅ 185/185 phpunit verde
- ✅ TypeScript estricto OK
- ✅ Next.js build OK (sin warnings)
- ✅ Bundle de `/admin/referidos` +0.19KB (RefCapture es shared)
