# Cierre de sesión — 2026-09-18

> Sesión corta de bugfix. Continúa tras [`cierre-sesion-2026-09-14.md`](cierre-sesion-2026-09-14.md).

## Qué se hizo

### Bugfix: dropdown del Select invisible dentro de modales

**Reporte del usuario**: al editar un producto, el select de **Categoría** no
desplegaba las opciones — solo se veía la categoría ya registrada.

**Causa raíz** (no era de datos ni backend): el panel del `Select` custom se
portalea a `<body>` con `z-[60]`, pero el `Modal` es `z-[80]` → el dropdown se
abría **detrás del modal** → invisible. Se verificó que `/categorias` devuelve
todas y que el parser de opciones funciona (test determinista).

**Fix**: `components/ui/Select.tsx` panel `z-[60]` → **`z-[95]`** (por encima de
Modal 80 y TourOverlay 90-92, por debajo de loaders/route-transition/toaster).
Arregla el dropdown en **todos** los modales (producto, ingrediente, topping,
staff, cupones…), no solo categoría.

- Commit `403a3a1`, desplegado a prod, **confirmado visualmente en producción**
  (dropdown "Bebidas / Postres" se ve sobre el modal al editar un producto).
- Detalle + jerarquía de z-index: [`docs/issues/2026-09-18-select-dropdown-detras-de-modal.md`](../issues/2026-09-18-select-dropdown-detras-de-modal.md).

## Nota de entorno (dev local roto — pendiente ajeno al fix)

No se pudo reproducir el bug en el dev local por un entorno roto **no relacionado**
con el fix: `GET /auth/me` (:8080) responde **500**, la cookie de auth no persiste
cross-port (:3000↔:8080), el `InitialLoader` (z-200) se queda atascado tapando la
página y el CSS de HMR se cae. El fix se validó por análisis + el propio síntoma +
confirmación en prod. Si se va a trabajar en dev local: `rm -rf apps/web/.next` +
reiniciar `npm run dev`, y **investigar por qué el API dev tira 500 en `/auth/me`**.

## Estado de producción al cierre

Sin cambios respecto al 09-14, salvo el fix del Select desplegado. Todo operativo:
verificación email, CAPTCHA, SMTP, self-service sucursales, gate de plan. Git =
prod (todo commiteado y pusheado, último `403a3a1`).

## Qué falta (igual que el cierre 09-14, nada nuevo)

1. **Bot de WhatsApp (n8n)** — bloqueado: elegir proveedor (recomendado Cloud API).
2. **Paridad ClickToShop** — portar lo de las sesiones 09-13/14 (verificación,
   correos, banner, cero-alertas, self-service sucursales) + este fix del Select.
3. **Ops**: backups off-site (B2), restringir Google Maps API key, revisar tokens
   viejos expuestos, build/alta de la app móvil en stores.
4. **Dev local**: arreglar el `/auth/me` 500 + auth/CSS del entorno de desarrollo.
5. Features en espera de demanda (pre-pago Stripe Connect, API pública, A/B testing,
   tracking repartidor, multi-idioma) — no construir sin cliente que las pida.
