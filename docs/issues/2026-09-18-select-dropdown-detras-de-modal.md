# Bug: el dropdown del Select no se veía dentro de un modal (parecía "solo la opción registrada")

**Fecha:** 2026-09-18 · **Estado:** ✅ resuelto y desplegado.

## Síntoma

Al **editar un producto** (admin/productos), abrir el select de **Categoría** no
mostraba las opciones — solo se veía la categoría ya registrada. Igual ocurría con
cualquier `Select` custom usado **dentro de un `Modal`**.

## Causa raíz

El `Select` custom (`components/ui/Select.tsx`) renderiza su panel de opciones en un
**portal a `document.body`** (para no ser recortado por `overflow-hidden`). Ese panel
tenía `z-[60]`. El `Modal` (`components/ui/Modal.tsx`) es `fixed inset-0 z-[80]`.

Como **80 > 60**, el panel se pintaba **detrás** del modal → invisible. El botón del
Select seguía mostrando el valor actual (la categoría registrada), así que parecía
que "no desplegaba las opciones". El parser de opciones y el backend `/categorias`
(que devuelve todas) estaban **correctos** — era puramente de stacking (z-index).

## Fix

`Select.tsx`: el panel pasó de `z-[60]` a **`z-[95]`**, quedando por encima de:
- `Modal` (z-80) → el dropdown se ve dentro de modales.
- `TourOverlay` (z-90/91/92) → se ve también cuando un tour recorre el select.

Y por debajo de los overlays de página completa (RouteTransition z-190, loaders z-200,
Toaster z-1000000), que nunca coexisten con un dropdown abierto. Ningún `Select` vive
dentro de esos overlays (CmdK/Bells/UpgradeModal no usan Select), así que no hay regresión.

## Jerarquía de z-index (referencia para no repetir el bug)

| Capa | z-index |
|---|---|
| Select (panel, portal a body) | **95** |
| Clicky widget | 70 |
| Modal | 80 |
| TourOverlay | 90–92 |
| RouteTransition | 190 |
| InitialLoader / CmdK / Bells / UpgradeModal | 200 |
| Toaster | 1000000 |

**Regla**: cualquier overlay nuevo que deba contener un `Select` debe quedar por
**debajo de 95**, o el dropdown del Select se cubrirá. Si un overlay por encima de 95
necesitara un Select, subir el z del panel del Select en consecuencia.

## Nota

El bug se diagnosticó por análisis de código + el propio reporte (el panel quedaba
detrás del modal es la prueba de que comparten stacking context y el z-index decide).
No se pudo reproducir en el dev local por un entorno roto no relacionado (auth/me 500,
loader atascado, CSS de HMR caído). Verificación final: en producción.
