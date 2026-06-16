# Extras / Toppings de productos

Cada producto puede tener uno o más **grupos de extras** que el cliente personaliza al pedir. Ejemplos:

- Grupo "Toppings" (`kind: many`): el cliente puede elegir varios (extra queso $15, jalapeños $10, doble carne $25).
- Grupo "Tamaño" (`kind: one`, `required: true`): el cliente debe elegir uno (chico $0, mediano $20, grande $40).
- Grupo "Salsas" (`kind: many`): varias opciones gratuitas o con costo.

## UI de edición (owner)

`/admin/productos` → editar producto → sección "Extras / Toppings". Componente `<ExtrasEditor>` permite:

- Agregar/eliminar grupos.
- Por grupo: nombre, tipo (uno o varios), si es obligatorio.
- Por opción dentro del grupo: nombre + precio extra.

## Estructura en BD

Columna `productos.extras` (JSON). Schema:

```ts
type ExtraGroup = {
  group:    string;          // ej. "Toppings"
  kind:     'one' | 'many';  // single-choice o multi-choice
  required?: boolean;        // si el cliente debe elegir al menos uno
  items: {
    id:    string;           // identificador único del item
    name:  string;           // ej. "Queso extra"
    price: number;           // costo adicional MXN
  }[];
};
```

## Cómo lo ve el cliente final

En la landing pública (`/[slug]`) → modal de producto, cada grupo se renderiza como:

- `kind: one` → radio buttons (chico/mediano/grande).
- `kind: many` → checkboxes.
- Precio total del producto se actualiza en vivo según las opciones marcadas.

Al enviar el pedido, los extras seleccionados se persisten en `detalle_pedidos.extras_seleccionados` como JSON:

```json
[
  { "group": "Toppings", "item": "Queso extra", "price": 15 },
  { "group": "Tamaño",   "item": "Grande",       "price": 40 }
]
```

Esto es **snapshot** — si después editas el extra, el pedido viejo conserva el precio cobrado.

## Validación backend

`StoreProductoRequest` y `UpdateProductoRequest`:

```php
'extras'                  => ['nullable', 'array'],
'extras.*.group'          => ['required_with:extras', 'string', 'max:40'],
'extras.*.kind'           => ['required_with:extras', 'in:one,many'],
'extras.*.required'       => ['nullable', 'boolean'],
'extras.*.items'          => ['required_with:extras', 'array', 'min:1'],
'extras.*.items.*.id'     => ['required', 'string', 'max:40'],
'extras.*.items.*.name'   => ['required', 'string', 'max:60'],
'extras.*.items.*.price'  => ['required', 'numeric', 'min:0'],
```

El backend del pedido público (`OrderService::crear`) usa los extras del producto vivo como source-of-truth y rechaza extras inventados por el cliente.
