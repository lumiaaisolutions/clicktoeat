# Fix: overlap del hero con la info card en la landing pública (2026-08-06)

## Problema

En `/{slug}` (landing pública del local), cuando el nombre del local y/o el
`tagline` eran largos, el texto se encimaba visualmente con la tarjeta blanca
"Abierto AHORA / Horario / Ubicación" que flota sobre el borde inferior del
header.

Reportado por el usuario con screenshot: "no se visualiza bien el slogan y el
nombre del negocio, se amontona".

## Causa raíz

`apps/web/src/app/[slug]/LandingClient.tsx`:

- El `<header>` tenía una altura **fija**: `height: clamp(220px, 34vh, 360px)`
  con `overflow-hidden`.
- El contenido del hero (logo + tagline + `<h1>` nombre) estaba posicionado
  `absolute inset-0`, con solo `pb-20 sm:pb-24` de padding inferior reservado.
- La info card (`<section>`) usa `margin-top: -70px` y `z-[8]` (mayor que el
  `z-[5]` del hero body) para flotar sobre el borde inferior del header.

Para taglines/nombres largos, el contenido del hero excedía el padding
reservado y el `overflow-hidden` del header lo recortaba justo donde
empezaba a superponerse con la info card — de ahí el amontonamiento.

## Fix

- `height` fija → `minHeight` en el `<header>`. El header ahora puede crecer
  con el contenido real.
- Hero body: `absolute inset-0` → `relative` (flujo normal). Si el nombre o
  el tagline son largos, empujan el header hacia abajo en vez de desbordar
  o recortarse contra la info card, que sigue flotando -70px más abajo del
  nuevo borde (más alto) del header.

Verificado visualmente con un tagline de prueba largo en `tacos-el-gordo`
(local demo) — el header creció para contener el texto completo, sin
overlap con la info card. Fix aplicado de forma idéntica en ClickToShop
(mismo componente, mismo bug — ver su propio changelog).

## Archivos tocados

- `apps/web/src/app/[slug]/LandingClient.tsx`
