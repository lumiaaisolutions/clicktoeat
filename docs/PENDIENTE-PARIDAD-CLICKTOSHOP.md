# Pendiente de paridad → ClickToShop

> Regla persistente (CLAUDE.md): las **features de plataforma** deben mantenerse a
> la par en ClickToEat y ClickToShop, adaptando sólo el contexto de dominio
> (copys, módulos, branding). Este archivo lista lo que se construyó en ClickToEat
> y **aún NO está portado** a `../clicktoshop`. Verificado 2026-09-11: clicktoshop
> no tiene `ToppingGroup`, ni `unidades.ts`, ni `TurnstileVerifier`.

Cuando portes cada punto, adapta el dominio (restaurante→tienda: platillo→producto,
receta/ingredientes→insumos del catálogo) y **bórralo de esta lista**.

## Toppings (bloque completo)
1. **Catálogo reutilizable de toppings** + selección en producto (snapshot en `extras`). — `65a12cd`
2. **Recetas por opción** (mini-receta ligada a ingredientes) + **descuento de inventario al vender** + **disponibilidad** ("agotado"). — `5c44a95`
3. **Bloqueo en el menú del cliente** (opción agotada deshabilitada; receta no se filtra al público). — `8b9a892`, `1cea382`
4. **Límite por grupo**: `incluidos` (los N más caros gratis) + `maximo`. Motor en `OrderService::validarYNormalizarExtras`. — `dd85bfb`
5. **Selector de toppings en el landing del cliente** (`ProductDetailSheet`): elegir opciones, marcar "incluido"/agotado, tope, total en vivo. — `c6d0212`
6. **Unidad por línea de receta** (entrada sin decimales; guarda en unidad del ingrediente). — `af26f8d`

## Inventario / unidades
7. **Más unidades de medida** con etiqueta explicativa (`lib/unidades.ts`: pz/g/kg/ml/L/oz/lb) + `unidadCorta`. — `704a172`
8. **Conversión automática al cambiar la unidad** de un ingrediente (stock/mínimo/costo + todas las recetas: tabla + toppings + productos), transaccional, `UnitConverter` con `canConvert`. Migración `costo_unitario` decimal(12,4). — `cd0d9aa`

## Pedidos
9. **Rediseño del detalle** con timeline visual interactivo + CTA prominente. — `0abe016`
10. **Timeline/CTA por modo de entrega**: "en camino" sólo a domicilio; etiqueta "Listo para recoger/entregar" según pickup/mesa. — `b48798d`
11. **Mensaje de WhatsApp**: muestra el **nombre** del topping (no el id) + precio del extra `(+$X.XX)` + línea **"Especificaciones"** (notas del pedido). Backend + espejo TS + test. — `1250dc0`, `0a7cf41`

## Plataforma / UX
12. **Barrido total de emojis → íconos SVG** (panel + landing + glifos). En ClickToShop es un barrido **equivalente** (adaptar su propio set de íconos), no copiar. — `6e7ae8d`
13. **Vista escalonada (wizard)** en formularios de alta: toppings, ingredientes, categorías (producto ya lo tenía). — dentro de `dd85bfb`

## Seguridad
14. **Cloudflare Turnstile (anti-bot)** en login (tras 3 fallos) y registro, gated por env, no-op sin llaves. — `8201b1b`
    (En ClickToShop necesitará su propio par de llaves Turnstile.)

## Nota
- El **carrusel de login editable** (super-admin) también es feature de plataforma
  (`5fc457d`, `4a644b1`, `707dfd8`) — verificar si ClickToShop lo tiene; si no, portar.
