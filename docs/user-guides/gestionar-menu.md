# Gestionar el menú

> Cómo organizar y mantener tu carta de productos.

## Estructura

Tu menú tiene 3 niveles:

```
Local (tu negocio)
└── Categorías  (ej: Tacos, Bebidas, Postres)
    └── Productos (ej: Taco al Pastor)
        └── Extras (ej: Tortilla → Maíz o Harina | Salsas → Verde, Roja, Habanero)
```

## Categorías

### Crear

Menú lateral → **Categorías** → "Nueva categoría".

Campos:
- **Nombre**: el que ve el cliente (ej. "Tacos", "Bebidas", "Postres").
- **Ícono**: opcional. Si tu panel lo soporta, puedes elegir un ícono representativo.
- **Orden**: número. Las categorías se ordenan ascendente (orden=0 sale primero). Si las dejas todas en 0, se ordenan por nombre.
- **Activo**: switch para mostrar/ocultar sin borrar.

### Renombrar / editar

Click en la categoría → editar → Guardar.

> Lo único que **no** puedes cambiar después es el `slug` (la versión URL del nombre). Si renombras "Tacos" a "Antojitos", el slug interno sigue siendo `tacos`. No es visible para el cliente, sólo en URLs internas.

### Borrar

Sólo se puede borrar una categoría **sin productos**. Si tiene productos, el sistema te dice "No se puede eliminar: la categoría tiene productos. Reasígnalos primero".

Para borrarla:
1. Mueve los productos a otra categoría primero.
2. Luego borra la categoría.

## Productos

### Crear un producto sencillo

Menú lateral → **Productos** → "Nuevo producto".

Campos básicos:

| Campo            | Para qué                                                |
|------------------|---------------------------------------------------------|
| **Categoría**    | Obligatoria. Selecciona la que ya creaste.               |
| **Nombre**       | Como lo ve el cliente. Ej: "Taco al Pastor".              |
| **Descripción**  | Texto largo. Ingredientes, recomendaciones, etc.          |
| **Precio**       | En pesos, sin signo `$`. Ej: `28`.                        |
| **Precio descuento** | Opcional. Aparece tachado el original + el rebajado.  |
| **Imagen**       | Foto del producto. Recomendado 800×800 o 1200×800.        |
| **Disponible**   | Switch. Off = no se muestra al cliente.                    |
| **Tag**          | Etiqueta corta visible: "Más pedido", "Nuevo", "Vegano".  |
| **Orden**        | Número para ordenar dentro de la categoría.                |
| **Es combo**     | Marca visual (banderita "Combo").                           |
| **Es promoción** | Marca visual (banderita "Promo").                           |

### Subir la imagen

Cuadro "Imagen" → click o arrastra el archivo.

Limitaciones:
- Formatos: JPG, PNG, WebP, AVIF.
- Máximo 5 MB.
- Se sube y aparece la preview.

> Si reemplazas la imagen, la anterior se borra del servidor automáticamente — no se acumulan archivos huérfanos.

### Productos con extras (variantes)

Ejemplo: "Taco al Pastor" con elección de tortilla y salsas.

Sección **Extras** del editor de producto:

#### Grupo 1 — Tortilla

- **Grupo** (nombre): "Tortilla".
- **Tipo**: "Uno solo" (el cliente sólo puede elegir UNA opción).
- **Obligatorio**: ✅ (no puede pedir sin elegir).
- **Opciones**:
  - "Maíz" — precio adicional: 0.
  - "Harina" — precio adicional: 5.

Si el cliente elige Harina, el precio del taco sube $5 sobre el precio base.

#### Grupo 2 — Salsas

- **Grupo**: "Salsas".
- **Tipo**: "Varios" (el cliente puede elegir varias).
- **Obligatorio**: ✗ (opcional).
- **Opciones**:
  - "Verde" — 0.
  - "Roja" — 0.
  - "Habanero" — 0.

El cliente marca cuáles quiere; no afecta precio.

### Editar un producto

Click → modificar → Guardar.

Los cambios **no afectan pedidos viejos** — los pedidos guardan una "foto" del producto en el momento de la compra (nombre + precio). Esto significa:

- Subes el precio → el cliente que ya pidió sigue mostrando el precio anterior.
- Renombras → los pedidos viejos siguen mostrando el nombre original.
- Borras un producto → los pedidos viejos siguen mostrando "Taco al Pastor" aunque ya no exista.

Esto es por diseño. Te protege de "qué dice mi histórico de ventas".

### Borrar un producto

Click → "Eliminar" → confirmar.

- El producto se marca como borrado (no se elimina físicamente — soft delete).
- Su imagen se borra del servidor.
- Deja de aparecer en la landing.
- Tus pedidos viejos siguen mostrando el producto (gracias al snapshot).

> Si te equivocaste al borrar, hoy no hay forma de "restaurar" desde el panel — contacta soporte. (Pendiente: botón de restore.)

### Marcar agotado temporalmente

Mucho más común que borrar: **switch "Disponible" → off**.

- El producto desaparece de la landing pública.
- Sigue existiendo en tu panel.
- Cuando vuelva a haber, switch on → reaparece.

## Ordenar productos dentro de una categoría

El campo `orden` define el orden. Productos con menor `orden` salen primero.

- Si los dejas todos en 0, se ordenan por `nombre` ascendente.
- Pon números espaciados (10, 20, 30) para poder insertar en medio sin renumerar todo.

## Reasignar productos a otra categoría

Click producto → cambiar "Categoría" → Guardar.

## QR del menú

Menú lateral → **QR**.

- Aparece tu URL pública (ej. `https://clicktoeat.lumiaaisolutions.com/tacos-el-gordo`).
- QR generado abajo.
- "Descargar PNG" → imprime.

Tips:
- Imprime en tamaño suficiente para ser escaneable a 30cm (mínimo 5×5 cm impreso).
- Pon una indicación corta: "Escanea para ver el menú y pedir por WhatsApp".
- Si imprimes muchas (mesas), considera plastificarlas o ponerlas en pie metálico.

## Inventario y recetas

Cada producto puede tener una **receta** asociada — qué ingredientes consume cuando se vende.

Esto permite descuento automático de stock cuando recibes pedidos.

→ Ver guía completa: [`inventario.md`](inventario.md).

## Errores comunes

| Síntoma                                       | Causa                                          |
|----------------------------------------------|------------------------------------------------|
| "Slug duplicado"                              | Otro producto del local ya usa ese nombre. Cambia el nombre.    |
| Imagen no sube                                | Excede 5 MB. Comprímela en herramientas online (TinyPNG, squoosh.app). |
| "La categoría tiene productos"                | No puedes borrar una categoría no vacía. Mueve los productos primero. |
| Precio descuento debe ser menor al precio     | Validación: el descuento es el precio rebajado. Pon un valor < precio normal. |
| Extras no aparecen al cliente                 | Probablemente no guardaste después de agregarlos. Revisar.       |
| Producto aparece pero sin imagen              | Subiste el archivo pero la sesión se cerró antes de guardar. Volver a subir + Guardar. |

## Tips de UX

- **Foto** es lo más importante en conversión. Invierte en una buena (luz natural, fondo neutro).
- **Descripción** corta y apetitosa. "Tortilla artesanal de maíz azul con pastor del trompo, piña, cilantro y cebolla" > "Taco al pastor".
- **Precios redondos** ($30, $50, $80) funcionan mejor que ($29.50).
- **Top 3 productos** marcados como "Más pedido" suelen vender 2x más.
- **Categoría de bebidas siempre al final** — el cliente ya armó su comida, ahora completa.
