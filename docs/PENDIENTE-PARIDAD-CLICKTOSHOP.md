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

---

## Sesión 2026-09-12 — rediseño de panel + correos (bloque grande)

> Todo esto son features de plataforma construidas en ClickToEat y **aún sin
> portar** a ClickToShop. Adapta el dominio (restaurante→tienda) y bórralo al portar.

### Kit de UI / interacción
15. **Select en portal** (`components/ui/Select.tsx`): el panel se renderiza en portal a `body` con `position:fixed` — inmune a `overflow-hidden` de ancestros.
16. **Toaster propio** (`components/ui/Toaster.tsx` + `store/toast.ts`) que **reemplaza la dependencia `sileo`**: notification-card por estado, portal con z sobre modales, swipe, barra de progreso. Ver ADR del Toaster.
17. **Botones de acción** (`components/ui/actions.tsx`): `EditButton` (lápiz), `ViewButton` (ojo), `DeleteButton` (**Hold-to-Delete** "Mantener para eliminar" + bola de papel; el hold es la confirmación), `CreateButton` ("+" líquido), `ActionButton` (secundario ícono+tooltip). Swap system-wide.
18. **ConfirmDialog** (`store/confirm.ts` + `components/ui/ConfirmDialog.tsx`): reemplaza TODOS los `confirm()`/`alert()` nativos (0 alertas del navegador).
19. **Wizard** aplicado a más modales crear/editar: staff, cupones, compras, locales, turnos, reservaciones, lealtad.

### Panel / vistas
20. **Shell del panel**: indicador de nav activo que se desliza (`layoutId`), sidebar cálido.
21. **Métricas interactivas**: segmented deslizante, KPIs con count-up, gráfica con tooltip que sigue el cursor + trazo animado, leyenda toggle, heatmap con tooltip.
22. **Landing polish**: hero glow de marca, chip de categoría con `layoutId`, entrada escalonada de cards (sin tocar carrito/checkout).
23. **+26 íconos** de comida/bebida en el selector de categorías (`Icon.tsx` + `IconPicker.tsx`).
24. **Audit-log** agrupado por día colapsable + descripciones humanas sin tecnicismos.
25. **Branding**: botón "Guardar cambios" resalta + barra fija cuando hay cambios sin guardar.
26. **Reviews**: al click en una reseña, modal con detalle de cliente + venta + **historial del cliente** (`GET /clientes/historial`).

### Salón / caja / mesero (parcial en ClickToShop — sin dine-in, adaptar)
27. **Caja**: panel explicado + botones con diseño + **historial "Cobrados hoy"** (`GET /caja/cobrados`) + confirmación antes de cobrar.
28. **Mesero**: atribución visible — mesas "Atiende", caja "Atiende" en cuentas y "Cobró" (`pedidos.cobrado_por`) en Cobrados hoy; preset "Mesero" + módulos de salón en la grilla de permisos.
29. **Sucursales**: "Abrir solicitud de soporte" crea un ticket real (`POST /soporte/tickets`).

### Sistema de correo (bloque completo)
30. **Diseño unificado**: layout base `mail/layout.blade.php` (splash suave durazno→crema + logo ClickToEat PNG `/email-logo.png` + footer `contacto@...`); las 13 plantillas migradas (incluye reset password convertido a vista).
31. **Seguimiento de pedido por correo** (`PedidoEstadoMail`, mode-aware) + **comprobante** en `pedido_confirmado` + **correo obligatorio** en el landing + campo `pedidos.origen` (landing|pos).
32. **SMTP**: auth con buzón primario (los alias no autentican). Ver runbook de mail.
