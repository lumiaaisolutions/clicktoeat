# Toppings — catálogo reutilizable de grupos de opciones

> Apartado dedicado para crear y administrar los "toppings" (grupos de opciones
> como Tamaño, Salsas, Extras) **una sola vez** y luego **seleccionarlos** al
> crear un producto, en vez de re-escribirlos cada vez. Añadido 2026-09-10.

## Concepto

Un **grupo de toppings** es un tipo de elección que el cliente hace al pedir:
- `kind: 'one'` → elige **una** opción (ej. Tamaño: Chico / Mediano / Grande).
- `kind: 'many'` → elige **varias** (ej. Extras: Queso +$15, Tocino +$20).
- `required` → obligatorio elegir para poder pedir.

## Modelo de datos

Tabla `topping_groups` (tenant-scoped, `BelongsToTenant`):
`id, local_id, nombre, kind ('one'|'many'), required (bool), items (json:
[{name, price}]), activo (bool), timestamps`. Modelo `App\Models\ToppingGroup`
(casts: `items:array`, `required/activo:boolean`).

## Relación con el producto (snapshot, no acople)

El producto **no** referencia el catálogo por FK. Cuando el usuario elige un
grupo guardado en el editor de producto, se **copia** a la columna `extras`
(JSON `ExtraGroup[]`) del producto como snapshot:
`{ group: nombre, kind, required, items: [{id, name, price}] }`.
Así, editar o borrar un grupo del catálogo **no altera** los productos que ya lo
tenían (el pedido histórico y el menú quedan estables). El usuario también puede
seguir definiendo un grupo a mano solo para ese platillo.

## API (grupo tenant autenticado)

- `GET /api/v1/toppings` — lista los grupos del local.
- `POST /api/v1/toppings` — crea (owner).
- `PATCH /api/v1/toppings/{topping}` — edita (owner).
- `DELETE /api/v1/toppings/{topping}` — borra (owner).

`ToppingGroupController` + `ToppingGroupResource` + `Store/UpdateToppingGroupRequest`
+ `ToppingGroupPolicy` (owner/super_admin; `viewAny` para cualquier miembro del
local). Ruta `apiResource('toppings')->except(['show'])`. Tests:
`tests/Feature/ToppingGroupTest.php` (CRUD + aislamiento multi-tenant + staff 403).

## Frontend

- **Página** `/admin/toppings` (`src/app/admin/toppings/page.tsx`): lista + modal
  `ToppingModal` (`components/admin/catalogo/ToppingModal.tsx`) con `InfoBox`
  explicando el concepto, selector visual de "¿cuántas puede elegir?", editor de
  opciones (nombre + costo extra). Ítem de nav "Toppings" (`permiso: productos`).
- **Editor de producto** (paso 3 "Extras"): arriba muestra **"Elige de tus
  toppings guardados"** — chips que al pulsarse agregan el grupo a `extras`
  (marca ✓ los ya agregados). Abajo sigue el editor manual para casos únicos.
  `ProductoModal` hace `GET /toppings` al abrir (prop `initialToppings` solo para
  preview/tests).

## Responsive

Página y modales responsive (el modal es bottom-sheet en móvil vía el componente
`Modal`; los chips y grids hacen wrap). Verificado en localhost.
