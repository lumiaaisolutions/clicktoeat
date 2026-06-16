# Tour multi-sucursal

Tour interactivo que explica el `LocalSwitcher` (selector de sucursal) a
owners/staff que tienen acceso a más de un local.

## Cuándo se dispara

`apps/web/src/components/help/AutoTourTrigger.tsx` consulta
`GET /me/locales` al montar el layout. Si:

- El user ya vio el tour de bienvenida (`seen.has('bienvenida') === true`)
- Tiene >= 2 locales asignados
- Nunca ha visto el tour de multi-sucursal (`shouldAutoTour('multi-sucursal')`)

…entonces dispara `openTour('multi-sucursal')` con 1.5s de delay (para no
encimarse con la bienvenida).

## Pasos del tour

1. **Intro** (sin target): "Tienes varias sucursales"
2. **Selector** (target `[data-tour="local-switcher"]` en el sidebar):
   "Toca esta tarjeta y elige otra sucursal. Todo el panel se recarga…"
3. **Datos separados** (sin target): "Cada sucursal tiene su propio menú…"

## También disponible manualmente

Aparece como card en `/admin/ayuda` con icono `store`. El owner puede
re-disparar el tour cuando quiera.

## Implementación

- Tour definido en `apps/web/src/components/help/tours.ts` bajo el slug
  `'multi-sucursal'`.
- `LocalSwitcher` tiene el atributo `data-tour="local-switcher"` en su
  wrapper para que el step 2 lo encuentre y resalte.
- Auto-trigger en `AutoTourTrigger` consulta el endpoint y cachea el count
  en state local (no hace falta state global).
