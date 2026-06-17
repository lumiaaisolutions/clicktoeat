# Ticket con branding + link calificación robusto — 2026-06-17 (tarde 3)

Continuación de `fixes-pedidos-reviews-fuentes-2026-06-17b.md`. 4 fixes en 3 fases.

## Fase 1 — Landing público

### 1.1 Botón footer: "Ir a ClickToEat"

`apps/web/src/app/[slug]/LandingClient.tsx` — el texto del botón del footer
del landing del local cambió de:

> Ver más restaurantes en ClickToEat

a:

> Ir a ClickToEat

Más corto, más directo. El link apunta al mismo destino (directorio raíz).

### 1.2 "Lo más pedido hoy" — tamaño coherente con catálogo

**Antes**: la card del banner usaba clases propias (`rounded-xl border`,
`px-2 py-2`) que la hacían ver desproporcionada al lado de las cards del
catálogo de productos abajo. En el screenshot reportado, con 1 solo
producto en `hot`, la imagen se veía gigante.

**Ahora**: `HotProductosBanner` usa exactamente el mismo styling que
`ProductCard`:

- `aspect-square` en mobile, `aspect-[16/11]` en sm+
- `rounded-2xl sm:rounded-3xl`
- `bg-[#FBF7F1]` (mismo fondo de imagen)
- Wrapper `ce-pimg` con hover-scale heredado del CSS de cards
- Sombra `0 6px 18px -10px rgba(35,25,15,.18)`
- Padding y tipografía idénticos a las cards de catálogo (`ce-body`, `font-bold`)

Resultado: independientemente de cuántos hot items haya (1, 2 ó 3), la
proporción de la imagen es **idéntica** a la de los productos del menú.

## Fase 2 — Link de calificación robusto

### El problema

El botón "⭐ Link de calificación" en `/admin/pedidos` arrojaba
`"Este pedido aún no tiene link de calificación. Vuelve a marcarlo como
entregado."` para pedidos donde:

- El review no se creó al transicionar a `entregado` (legacy, antes del
  rollout de F100).
- El POS de mostrador creó el pedido y lo entregó saltándose la transición
  que dispara la creación del review.

El flujo original asumía que el `review_token` ya estaba en el resource del
pedido. Si faltaba → error duro, sin recovery.

### La solución: endpoint on-demand

#### Backend

Nuevo endpoint protegido:

```
POST /api/v1/admin/pedidos/{pedido}/review-link
→ 200 { "token": "abc123..." }
→ 422 { "message": "Solo se puede generar link de calificación para pedidos entregados." }
```

Implementación en `ReviewController::ensureForPedido`:

- Valida que el pedido esté en estado `entregado`.
- Si ya existe `Review` para ese `pedido_id` → devuelve su token.
- Si NO existe → crea uno nuevo con `rating=0`, `aprobado=false` y devuelve
  el token recién generado.

Idempotente: llamadas repetidas devuelven el mismo token. Sin race
condition realista porque está scopeado a `pedido_id` único.

#### Frontend

`/admin/pedidos/page.tsx` — `abrirLinkCalificacion(p)`:

1. Si `p.review_token` existe → abre modal directo (caso normal post-F100).
2. Si NO existe → POST al endpoint, recibe `{ token }`, actualiza el item
   en el state local (`setItems`) y abre el modal con el pedido enriquecido.

Visualmente, el botón muestra "Generando…" con `animate-pulse` mientras
espera. Tras esto, el flujo del modal de WhatsApp es idéntico al normal.

### Sobre el WhatsApp automático

El usuario preguntó si el envío por WhatsApp es automático. Respuesta: **no
es automático, pero sí es 1-click**. Al abrir el modal de "Link de
calificación", el primer botón verde dice **"Abrir WhatsApp del cliente"**
y dispara `https://wa.me/{telefono_del_pedido}?text={mensaje+link}` —
el chat se abre con el mensaje pre-llenado, el owner solo da Enter.

Es 1-click porque mandar automático requeriría la API oficial de WhatsApp
Business (de pago, con verificación de número, plantillas pre-aprobadas
por Meta). El deeplink mantiene cero costos de infraestructura.

## Fase 3 — Ticket del POS con branding + descarga

### El problema

El ticket del POS (modal post-cobro en `/admin/punto-venta`) mostraba
"ClickToEat" como header — un nombre genérico que no representaba al
negocio del owner. Además, al imprimir, el navegador usaba página
Carta/A4 y dejaba un montón de papel en blanco alrededor del ticket de
280px (que en una térmica de 80mm sale gigante y con páginas vacías).

### Fixes

#### Branding real del negocio

`PuntoVentaPage` ahora carga `GET /local` en paralelo con productos y
categorías. Pasa el `LocalAdmin` al `TicketModal` como prop. El ticket
renderiza:

- **Logo** del local (si existe `logo_url`), `crossOrigin="anonymous"`
  para que html2canvas pueda capturarlo sin CORS issues.
- **Nombre** del local (`local.nombre`), no "ClickToEat".
- **Dirección** y teléfono / WhatsApp del local.
- Folio, fecha, líneas, total, pago, cliente.
- Pie discreto: "via ClickToEat" en 9px y opacity 60% (atribución suave).

#### Impresión con tamaño correcto

Nuevo bloque CSS en `globals.css`:

```css
@page ticket {
  size: 80mm auto;
  margin: 4mm;
}

@media print {
  #ticket-print {
    width: 72mm !important;
    page: ticket;
    color: #000 !important;
  }
}
```

Ahora cualquier impresora térmica 80mm imprime el ticket sin desperdicio
de papel ni páginas en blanco. En impresora de hoja, sale igualmente
proporcionado al ancho real del ticket.

#### Descarga como imagen PNG

Nuevo botón "Descargar imagen" junto a "Imprimir" y "Cerrar".

Implementación:

- `html2canvas@^1.4.1` agregado a `apps/web/package.json`.
- Carga **dinámica** con `await import('html2canvas')` para mantener el
  bundle inicial limpio (html2canvas pesa ~150KB y solo se usa al pulsar
  el botón).
- Captura `#ticket-print` con `scale: 2` (retina), `useCORS: true`, fondo
  blanco.
- Convierte a `Blob`, crea object URL, dispara descarga con nombre
  `ticket-{codigo}.png`, revoca el URL.

Output: imagen PNG nítida lista para mandar por WhatsApp/email al
cliente, archivar como comprobante, o subir a contabilidad.

## Archivos tocados

```
apps/api/app/Http/Controllers/Api/ReviewController.php   # +ensureForPedido()
apps/api/routes/api.php                                  # +1 ruta POST
apps/web/package.json                                    # +html2canvas
apps/web/src/app/admin/pedidos/page.tsx                  # abrirLinkCalificacion async
apps/web/src/app/admin/punto-venta/page.tsx              # TicketModal branding + descarga
apps/web/src/app/[slug]/LandingClient.tsx                # botón footer + HotProductosBanner
apps/web/src/app/globals.css                             # @page ticket 80mm
```

## Verificación

- ✅ 185/185 phpunit verde
- ✅ TypeScript estricto OK
- ✅ Next.js build OK
- ✅ Ningún warning en compilación

## Próximos pasos sugeridos (no implementado en esta tanda)

- Cliente final del landing también podría tener "Descargar ticket" en
  la pantalla de confirmación de pedido. Requiere modelar la vista del
  pedido cliente-side (hoy solo abre WhatsApp y limpia el carrito).
- En lugar de generar PNG client-side con html2canvas, se podría generar
  PDF server-side con Browsershot o DomPDF si se quiere tickets más
  formales (factura) — pero PNG cubre el 90% de los casos.
