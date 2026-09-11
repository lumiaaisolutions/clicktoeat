# Propuesta de UX — Formularios de alta más intuitivos (para gente no técnica)

> Objetivo: que **cualquier persona** (sin vocabulario técnico) entienda qué hacer
> al dar de alta productos, categorías, ventas, inventario y gastos.
>
> ⚠️ **Nota para ClickToEat:** los ejemplos y labels por sección de este doc
> vienen de la auditoría de **ClickToShop** (2026-09-10). Los **principios, el
> diccionario jerga→humano, las ideas transversales y la prioridad aplican igual
> aquí** — pero traduce el vocabulario al dominio de ClickToEat: producto/
> **receta**/**ingredientes**/**extras**, y sus módulos propios (**mesas/salón**,
> cocina/KDS). Revisar los formularios equivalentes de ClickToEat con esta misma
> lente antes de implementar.

## Diagnóstico en una línea

Los formularios exponen el **modelo de datos** (SKU, slug, ejes/variantes,
tipo de movimiento, merma, TPV, folio, IDs) en vez del **lenguaje del tendero**.
Además, el formulario de producto lo muestra **todo junto** (abrumador) y algunos
flujos van en dos tiempos poco obvios (guardar antes de adjuntar; definir ejes →
"Generar" → editar).

## Los 6 principios (aplican a todo)

1. **Hablar como el usuario, no como la base de datos.** Cada palabra técnica
   tiene un reemplazo humano (ver diccionario abajo).
2. **Esconder lo técnico, no borrarlo.** SKU, slug, IDs → autogenerados y ocultos
   bajo "Opciones avanzadas". El usuario nunca los ve salvo que quiera.
3. **Mostrar poco primero (divulgación progresiva).** Empezar con 3-4 campos; el
   resto detrás de "Agregar más detalles".
4. **Un ejemplo vale más que una etiqueta.** Todo campo dudoso lleva un ejemplo
   real como placeholder + una frase de "para qué sirve".
5. **Un solo verbo por acción.** Nada de "Enviar a caja"/"Cobrar"/"Confirmar
   cobro" para lo mismo.
6. **Errores que dicen qué arreglar, en cristiano.** Nunca `variantes.0.sku` ni
   "Fila 3: <texto backend>".

---

## Diccionario jerga → humano (cambio de labels, quick win #1)

| Hoy dice (técnico) | Dónde | Propuesta (humano) |
|---|---|---|
| **SKU** | productos, variantes, inventario, POS, ticket | "Código" (opcional, autogenerado) → **ocultar** bajo avanzado; tooltip: "Un código corto para identificarlo. Si no sabes, lo creamos por ti." |
| **Slug** | tabla categorías (monospace) | **Ocultar de la UI** (es parte de la dirección web, se genera solo) |
| **Ejes / ejes de variación** | producto → variantes | "¿Viene en varias opciones?" → **"Opciones"** (Talla, Color…) |
| **Generar variantes** (botón) | producto | **Quitar el botón**: crear las filas automáticamente al escribir las opciones |
| **Combinación** | variantes, inventario | La opción real: "Talla M · Color Negro" |
| **Variante única / Presentación única** | producto, POS | "Producto sin opciones" / **no mostrar el concepto** |
| **Stock** | inventario, POS | **"Cantidad disponible"** / "Existencias" |
| **Stock mínimo / "Mínimo"** | producto, inventario | **"Avisarme cuando queden pocas"** (nº) |
| **Tipo de movimiento** | inventario (select) | Reemplazar por 3 botones (ver §4) |
| **Entrada (suma) / Merma (resta) / Ajuste manual (+/−)** | inventario | **"Me llegó mercancía" / "Se dañó o perdió" / "Corregir la cantidad"** |
| **Stock tras** | historial inventario | **"Quedaron"** |
| **Referencia** | historial inventario | "Origen" / **ocultar** |
| **tarjeta_tpv / "Tarjeta TPV" / TPV** | POS, ticket | **"Tarjeta"** |
| **Transfer.** | POS | **"Transferencia"** |
| **Folio** | ticket | **"Venta #"** o "Ticket #" |
| **delta_pct (▲ 12%)** | gastos (resumen) | **"12% más que el mes pasado"** (con palabras) |
| **CSV** | gastos (botón) | **"Descargar a Excel"** |
| **"Variante #{id}"** | inventario (fallback) | Nombre del producto + "(opción sin nombre)"; **nunca IDs** |
| **CFE bimestral…** | gastos (placeholder) | "Recibo de luz de mayo" |
| **"tabs de la landing pública"** | categorías (hint) | "los botones de categoría en tu tienda" |

> Punto único de cambio para hints/labels/errores:
> `src/components/ui/FormField.tsx` (`Field`, `Select`, `Switch`, `Textarea`).

---

## §1 · Productos / Artículos (el más abrumador)

Hoy: 1 modal largo, 4 bloques (Básicos → Galería → Ficha técnica → Variantes),
con sub-editores que crecen a decenas de inputs.

**Alternativa A — Divulgación progresiva (recomendada, menos dev).**
Mostrar por defecto solo lo esencial:
```
[ Foto ]   Nombre: __________
           Categoría: [ ▾ ]      Precio: $ ____
           [ Disponible ✅ ]
           ▸ Agregar más detalles (galería, ficha, opciones)
[ Guardar producto ]
```
Todo lo demás (galería, ficha técnica, opciones/variantes, descuento, marca, tag)
colapsado bajo "Agregar más detalles". El 80% de los productos se dan de alta con
4 campos.

**Alternativa B — Asistente en 3 pasos (para los más perdidos).**
`1. Lo básico` (foto, nombre, precio, categoría) → `2. ¿Tiene opciones?`
(tallas/colores, si aplica) → `3. Detalles` (opcional). Botón "Guardar" ya activo
desde el paso 1. Más guiado, algo más de dev.

**Alternativa C — Foto primero + IA.** Ya existe "✨ Generar ficha con IA".
Convertirlo en el camino principal: subir foto → IA rellena nombre/descripción/
ficha → el usuario solo confirma y pone precio. "Sube una foto y llenamos lo demás
por ti."

**Opciones/variantes (lo más técnico) — rediseño puntual:**
- Pregunta simple arriba: **"¿Este producto viene en varias opciones?"** [No / Sí].
  Si "No" → un solo campo **"Cantidad disponible"** y listo (nada de SKU ni ejes).
- Si "Sí" → "¿En qué varía?" con chips sugeridos (Talla, Color, Sabor, Tamaño…).
  El usuario escribe los valores (S, M, G) y **la tabla se arma sola** (sin botón
  "Generar"). Columnas visibles: **Opción · Precio · Cantidad**. El SKU pasa a
  "Avanzado" y se autogenera (`PLAYERA-NE-M`).
- "Vacío = hereda el precio base" → reemplazar por prellenar el precio base ya
  escrito (editable), sin explicar herencia.

---

## §2 · Categorías

Hoy: Nombre · Icono · Orden · Activa (+ slug visible en la tabla).

- **Quitar el slug de la tabla** (o moverlo a un detalle "avanzado"). No aporta
  nada a un tendero y asusta.
- **"Orden" → arrastrar para ordenar** (drag & drop) en vez de un número con la
  regla "menor primero". Alternativa barata: botones ↑/↓ por fila.
- Hint del icono: "Aparece junto al nombre en **los botones de categoría de tu
  tienda**" (en vez de "tabs de la landing").
- Ejemplo inline en Nombre: placeholder "ej. Playeras, Pantalones, Ofertas".

---

## §3 · Ventas / Punto de venta (Caja)

Hoy: POS con 3 modales; nombres inconsistentes; TPV/Folio/SKU en el ticket.

- **Un solo verbo para cobrar.** Unificar: la acción de pasar el pedido a cobro =
  **"Pasar a cobro"**; la de cobrar = **"Cobrar $X"** (mismo texto en título y
  botón). Quitar "Confirmar cobro"/"Enviar a caja"/"Cobrar" mezclados.
- **Método de pago con palabras completas + iconos:** 💵 Efectivo · 💳 Tarjeta ·
  🔁 Transferencia (nada de "Transfer." ni "TPV").
- **Ticket sin jerga:** "Folio" → **"Venta #1234"**; quitar el **SKU** del ticket
  del cliente (dejarlo solo en la vista interna). El cliente ve producto, opción,
  cantidad, precio.
- Selector de variante: **"Elige la variante"** → **"Elige la opción"**;
  "Presentación única" → no mostrar (ir directo a cantidad).
- Errores: "Stock insuficiente…" → **"Solo quedan N de 'Playera M'. Ajusta la
  cantidad."**

---

## §4 · Inventario

Hoy: tabla técnica (SKU, Combinación, Stock, Mínimo) + modal "Ajustar stock" con
"Tipo de movimiento" (Entrada/Merma/Ajuste) y manejo de signos.

- **Reemplazar el select "Tipo de movimiento" por 3 tarjetas claras:**
  ```
  [ 📥 Me llegó mercancía ]   [ 📉 Se dañó o se perdió ]   [ ✏️ Corregir cantidad ]
  ```
  Cada una abre un mini-form con **"¿Cuántas piezas?"** (siempre positivo; la
  resta la decide la tarjeta, no el signo). "Merma" desaparece como palabra.
- Tabla: **"Stock" → "Cantidad"**, **"Mínimo" → "Aviso de pocas"**; ocultar SKU
  (o bajo "avanzado"); "Combinación" → mostrar la opción legible.
- Preview "Nuevo stock: N" → **"Van a quedar: N piezas"**.
- Historial: **"Stock tras" → "Quedaron"**, **"Referencia" → "Origen"**; los dos
  `date` desnudos → con label "Desde"/"Hasta"; nunca "Variante #id".
- Empty state ya es bueno ("El stock vive en cada variante…") → traducir a
  "Cada opción (talla/color) tiene su propia cantidad. Se descuenta sola con cada
  venta."

---

## §5 · Gastos

Hoy: 6 campos + comprobante en dos tiempos; CFE/CSV/▲%.

- **Adjuntar el comprobante ANTES de guardar** (guardar el archivo en el cliente y
  subirlo al guardar). Hoy obliga a guardar primero — rompe la expectativa.
  Si por arquitectura no se puede, al menos cambiar el texto a un paso 2 explícito
  con checkmark ("Paso 2: adjunta el recibo").
- Placeholder de Concepto: "ej. Recibo de luz de mayo" (sin siglas CFE).
- Resumen: "▲ 12% vs mes anterior" → **"Gastaste 12% más que el mes pasado"**
  (verde si menos, rojo si más, con la palabra).
- Botón "CSV" → **"Descargar a Excel"**.
- Categorías con emoji ya ayudan (👍). "Comisiones bancarias" → "Comisiones del
  banco".

---

## §6 · "Compras" — no existe (decisión pendiente)

Hoy no hay módulo de Compras; la entrada de mercancía se hace en Inventario →
"Entrada (suma)", sin proveedor/costo/factura.

- **Alternativa A (barata):** renombrar/expandir "Me llegó mercancía" para aceptar
  opcionalmente **proveedor**, **costo de compra** y **foto de factura**. Cubre el
  90% del caso sin un módulo nuevo.
- **Alternativa B (módulo):** un módulo "Compras" real (proveedores, órdenes,
  costo por entrada que alimente el margen). Más dev; solo si el negocio lo pide.

---

## Ideas transversales (aplican a todo el panel)

- **"¿Cómo funciona?"** en cada módulo: un enlace que abre un explicador de 20
  segundos (2-3 pasos con dibujitos), en lenguaje llano.
- **Checklist de arranque** para tiendas nuevas: "1) Crea una categoría → 2) Sube
  tu primer producto → 3) Haz tu primera venta". Reduce el "no sé por dónde
  empezar".
- **Modo simple / avanzado**: por defecto simple (campos mínimos); un toggle para
  quien quiera todo. Persistir la preferencia.
- **Estados vacíos que enseñan**: en vez de una tabla en blanco, una tarjeta con
  "Aún no tienes productos. Empieza con uno: sube una foto y ponle nombre y
  precio." + botón.
- **Mensajes de error humanos y por campo**: mapear las claves del backend
  (`variantes.0.sku`, `categoria_id`) a frases ("La opción 'Talla M' necesita un
  precio."). Nunca mostrar la clave cruda.

---

## Prioridad sugerida (impacto / esfuerzo)

**Quick wins (1-2 días, altísimo impacto):**
1. Diccionario jerga → humano (relabel masivo vía `FormField` + copys).
2. Ocultar SKU/slug/IDs de listas y formularios (a "avanzado").
3. Unificar verbos de cobro en el POS + quitar TPV/Folio/SKU del ticket del cliente.
4. Traducir mensajes de error a lenguaje humano por campo.

**Medio (3-5 días):**
5. Divulgación progresiva del formulario de producto (Alternativa A).
6. Inventario: 3 tarjetas de acción en vez de "Tipo de movimiento".
7. Gasto: adjuntar comprobante en un solo paso.
8. Categorías: ordenar arrastrando.

**Mayor (según negocio):**
9. Asistente de producto en 3 pasos (Alternativa B) y/o foto-primero con IA.
10. Módulo/flujo de "Compras" con proveedor y costo.

> Nota de paridad: implementar primero en un producto, validar con usuarios reales
> y portar al hermano adaptando vocabulario (ClickToEat: producto/receta/
> ingredientes; ClickToShop: artículo/variante/opción).

---

# Implementación — asistente por pasos (2026-09-10, ClickToEat)

Primera tanda implementada y desplegada en ClickToEat. Componente reutilizable
`Wizard` + rediseño de los formularios más confusos a **asistente por pasos**,
con lenguaje humano y responsive.

## Componente `Wizard` (`src/components/ui/Wizard.tsx`)
Chrome reutilizable de un formulario por pasos:
- **Desktop:** rail lateral con pasos numerados (actual resaltado, ✓ completado,
  pendiente en gris). Se puede volver a pasos ya vistos; adelante solo con
  "Siguiente".
- **Móvil:** el rail se oculta y aparece **"Paso X de N" + barra de progreso**
  de N segmentos + nombre del paso.
- Footer contextual: **Cancelar → ← Atrás / Siguiente → → Guardar** en el último.
- Presentacional: la validación/navegación vive en cada form. Acento configurable
  (ClickToEat usa `#F26A1F`).

## Alta de producto — 4 pasos (`components/admin/catalogo/ProductoModal.tsx`)
Extraído a su propio componente. Pasos:
1. **Lo básico** — "¿Qué platillo es?": Foto, Nombre del platillo, Categoría,
   Precio ($). Valida antes de avanzar.
2. **Presentación** — "¿Cómo se ve en tu menú?": Descripción, Etiqueta,
   *Mostrar en el menú*.
3. **Extras** — "¿Se puede personalizar?": grupos de extras/toppings.
4. **Inventario** — "¿Qué ingredientes usa?": receta simple (ingrediente +
   cantidad) que descuenta inventario con cada venta. **Se guarda tras crear el
   producto** (POST producto → PUT recetas con el id nuevo). Si el local no tiene
   ingredientes, muestra un aviso amable y se puede saltar.

## Gastos — 2 pasos (`app/admin/gastos/page.tsx`)
1. **El gasto** — "¿Qué gastaste?": categoría, concepto, monto ($), fecha.
2. **Detalles** — "¿Algo más?": *se paga cada mes*, notas, **comprobante**.
   - **Arreglado el flujo de dos tiempos**: ahora se puede **elegir el recibo
     antes de guardar** (se sube tras crear el gasto). Antes obligaba a guardar
     primero.
   - "Eliminar gasto" quedó como enlace discreto en el paso 1 (al editar).

## Categorías — relabels (`app/admin/categorias/page.tsx`)
Formulario corto (no amerita pasos): lenguaje simple. "Nombre de la categoría"
(+ejemplo), icono "Aparece junto al nombre en tu menú", "Orden en el menú"
("El número más bajo aparece primero"), "Mostrar en el menú".

## Inventario — relabels + tarjetas de acción (`app/admin/inventario/page.tsx`)
- **Ingrediente**: "Nombre del insumo" (+ejemplo), "¿Cuánto tienes ahora?",
  "Avisarme cuando queden", "Costo por unidad ($)", "En uso".
- **Ajuste de stock**: el select técnico "Tipo de movimiento" (Entrada/Merma/
  Ajuste) se reemplazó por **3 tarjetas**: 📥 *Me llegó más* · 📉 *Se dañó o
  acabó* · ✏️ *Corregir cantidad*. "Merma" desaparece como palabra. Cantidad
  siempre positiva; la resta la decide la tarjeta. **"Corregir" fija el total**
  (manda el delta; el backend suma un valor firmado). Preview: "Van a quedar: N".

## Pendiente / siguiente
- Portar el patrón a ClickToShop (paridad) adaptando vocabulario
  (artículo/variante/opción).
- Ventas/POS y otros formularios largos: evaluar pasos si el negocio lo pide.
