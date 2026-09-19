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

## Dev local roto → RESUELTO (misma sesión)

El dev local no cargaba (se quedaba en "Cargando…"). **Causa raíz encontrada**: la DB
local (sqlite) estaba **atrasada 3 migraciones** (`cobrado_por`, `origen`,
`max_sucursales`). Con el modo estricto de dev, `/auth/me` accede a
`$plan->max_sucursales` → columna inexistente → **500** → el gate del admin layout
(`if (!user)`) se quedaba en "Cargando…". Sumado a un `.next` corrupto por HMR (el
cliente no hidrataba).

**Fix**: `php artisan migrate` + `php artisan db:seed --class=PlansSeeder` en local, y
`rm -rf apps/web/.next` + reiniciar `npm run dev`. **Verificado**: `/auth/me` → 200 y
la app carga completa en local.

> Lección: tras agregar una columna que se lee en un endpoint caliente (`/auth/me`),
> correr la migración en **todos** los entornos, no solo prod. El modo estricto de dev
> convierte "columna faltante" en un 500 que tumba el arranque.

## Realtime → CERRADO (misma sesión)

Se "terminó" el ítem de realtime: el polling (arquitectura definitiva por
ADR-015/017) ahora es **uniforme a 15 s** en las 5 pantallas operativas. Estaba
disparejo: `cocina/mesero/mesas/caja` a 15 s pero **`pedidos` a 30 s** — la pantalla
más crítica (pedidos entrantes del landing) era la más lenta. Se alineó `pedidos` a
15 s. Ver estado de implementación en [ADR-017](../decisions/ADR-017-realtime-reverb-viable-en-vps-dedicado.md).
Reverb queda como opción futura del owner, no como pendiente.

## Estado de producción al cierre

Sin cambios respecto al 09-14, salvo el fix del Select desplegado. Todo operativo:
verificación email, CAPTCHA, SMTP, self-service sucursales, gate de plan. Git =
prod (todo commiteado y pusheado, último `403a3a1`).

## Qué falta

1. **Bot de WhatsApp (n8n)** — bloqueado: elegir proveedor (recomendado Cloud API).
2. **Paridad ClickToShop** — portar lo de las sesiones 09-13/14 (verificación,
   correos, banner, cero-alertas, self-service sucursales) + el fix del Select +
   el ajuste de polling de pedidos.
3. **Ops**: backups off-site (B2), restringir Google Maps API key, revisar tokens
   viejos expuestos, build/alta de la app móvil en stores.
4. Features en espera de demanda (pre-pago Stripe Connect, API pública, A/B testing,
   tracking repartidor, multi-idioma) — no construir sin cliente que las pida.

## Cerrado en esta sesión (09-18)
- ✅ Bug del Select dentro de modales (z-60→z-95) — en prod, confirmado.
- ✅ Dev local roto (migraciones + `.next` limpio) — la app carga en local.
- ✅ Realtime — polling 15s uniforme (pedidos alineado de 30s→15s); ítem cerrado.
