# Frontend — Componentes

## UI primitivos — `components/ui/`

### `Button.tsx`
Botón estilizado con variants (primary/ghost). Acepta `loading`, `disabled`. Estilo via Tailwind + CSS vars.

### `FormField.tsx`
Wrapper de input con label + error + helper text. Usado en todos los forms admin.

### `Modal.tsx`
Modal accesible con backdrop blur, animación de entrada (framer-motion). `open`/`onClose`. Renderiza children en portal.

### `Skeleton.tsx`
Placeholder gris con shimmer. Para listas y cards mientras cargan datos.

### `Toaster.tsx` + `store/toast.ts` (propio — reemplazó a `sileo`)
Toaster propio (framer-motion) que **sustituyó a la dependencia `sileo`**
(ver [`ADR-016`](../decisions/ADR-016-toaster-propio.md); supersede a
[`ADR-009`](../decisions/ADR-009-sileo-toaster-lazy-import.md)). Diseño
"notification card":

- **Badge de ícono por estado**: `success` (verde), `error` (rojo), `warning`
  (ámbar), `info` (azul), `neutral` (gris) — cada uno con su color de badge,
  barra y glow.
- Título + descripción opcional + botón cerrar.
- **Barra de progreso** inferior que se agota en `duration` (pausa al hover del
  ratón; `error` dura 6 s, el resto 4.2 s; `duration: 0` = no auto-cierra).
- **Swipe para descartar** (drag horizontal; suelta > 90 px o con velocidad).
- Portal a `document.body` con `z-index: 1000000` → **siempre por encima de
  modales y paneles de edición** (era el bug que motivó el cambio).
- Máx. 4 toasts visibles, el más reciente arriba. Respeta `prefers-reduced-motion`.

API pública del store (sin cambios para los ~20 call sites que ya la usaban):
`import { toast } from '@/store/toast'` → `toast.success(text, { description?, duration? })`
(+ `error` / `info` / `warning` / `neutral`, `toast.dismiss(id)`, `toast.dismissAll()`).
Existe un shim `useToast()` para call sites legacy.

### `ConfirmDialog.tsx` + `store/confirm.ts`
Diálogo de confirmación **con diseño que reemplazó a `window.confirm()` /
`alert()` nativos** — **cero alertas del navegador en todo el sistema**. Los dos
`alert()` que quedaban en el onboarding público (`/onboarding/elegir-plan`) se
cambiaron por un banner de error con diseño (estado local `error`, `role="alert"`).

- **API promise-based**: `const ok = await confirmAction({ title, message?, tone?, confirmLabel?, cancelLabel? })`
  resuelve `true` (confirmar) / `false` (cancelar). `tone: 'danger'` pinta el
  botón de acción en rojo y usa ícono de alerta.
- `role="alertdialog"`, focus automático al botón confirmar, `Enter` confirma /
  `Esc` cancela, click en backdrop cancela.
- Portal a `document.body` con `z-index: 999998`. Se monta **una vez** en el
  layout del panel. Respeta `prefers-reduced-motion`.

### `Select.tsx` (listbox custom en portal)
Reemplaza al `<select>` nativo en todo el sistema. Listbox accesible con teclado
completo (flechas, Home/End, typeahead, Escape), `aria-activedescendant`, apertura
con spring, resalte del elegido y micro "efecto burbuja" al elegir. Acepta
`options={[]}` o `<option>` children (compat nativa), variantes `field` (default)
y `pill`, `accent` configurable, y expone `name` (input oculto para forms nativos).

- **El panel se renderiza en un portal a `document.body` con `position: fixed`**
  y coordenadas de viewport → **inmune a cualquier ancestro con
  `overflow-hidden`** (dropdowns dentro de modales/tablas ya no se recortan).
- Decide abrir hacia arriba o abajo según el espacio disponible y **reposiciona
  en scroll (de cualquier ancestro) y resize** mientras está abierto.
- Cierra al hacer click fuera chequeando tanto el root como el panel del portal.

### `Wizard.tsx` (formularios por pasos)
Chrome presentacional reutilizable para formularios de alta/edición por pasos
(ver también [`ux-formularios-intuitivos.md`](ux-formularios-intuitivos.md)):

- **Desktop**: rail lateral con pasos numerados (actual resaltado, ✓ completado,
  pendiente en gris; se puede volver a pasos ya vistos).
- **Móvil**: rail oculto → "Paso X de N" + barra de progreso de N segmentos.
- Footer contextual: **Cancelar → ← Atrás / Siguiente → → Guardar** en el último.
- La validación/navegación vive en cada form; acento configurable (`#F26A1F`).

Se usa en los modales crear/editar de **staff, cupones, compras, locales, turnos,
reservaciones y lealtad (ChallengeModal)**, además de los del catálogo
(`ProductoModal`, `IngredienteModal`, `ToppingModal`, `CategoriaModal`) y en
`gastos`. Los formularios triviales (≤ 3 campos, p.ej. categorías) siguen como
modal simple.

### `actions.tsx` — kit de botones de acción
`components/ui/actions.tsx`. Familia de botones de acción con micro-animación de
firma, hover **controlado por estado** (no por variantes de framer), accesibles
(teclado + `aria-label` + `title`) y respetuosos de `prefers-reduced-motion`:

- **`EditButton`** — lápiz que "escribe" en hover (trazo con `pathLength` + lápiz
  que se desplaza).
- **`ViewButton`** — ojo cuya pupila parpadea (`scaleY`) en hover.
- **`DeleteButton`** — **Hold-to-Delete**: label "Mantener\npara eliminar" en 2
  líneas + barra roja que **crece mientras se mantiene presionado** (pointer o
  teclado); al completar el hold dispara una animación de "bola de papel al
  basurero" y luego `onDelete`. **El hold ES la confirmación** — no usa
  `confirm()` nativo ni `ConfirmDialog`. Prop `compact` para filas de tabla
  (texto/padding reducidos). `holdMs` configurable (default 1100 ms).
- **`CreateButton`** — "+" que gira 90° con relleno **líquido** (blob que sube y
  ondula) en hover. `label` y `icon` custom opcionales.
- **`ActionButton`** — acción secundaria neutral: ícono + tooltip con micro-hover.
  Soporta `onClick` **o** `href` (con `newTab`) conservando la navegación. Es el
  usado para Historial / Ajustar / Receta / Restaurar / QR / Copiar, etc.

Todos aceptan `data-tour` para engancharlos al sistema de tours.

### `Logo.tsx`
Logo SVG de ClickToEat. Variantes: `lockup` (con texto), `mark` (sólo símbolo). Size configurable.

### `QRCode.tsx`
Wrapper de `qrcode` (npm). Recibe URL + opciones de color y tamaño. Renderiza como `<canvas>` o `<img>`.

---

## Componentes de admin — `components/admin/`

### `ImageUpload.tsx`
File picker + preview + auto-upload a `/uploads/image`. Devuelve `{ url, public_id }` al padre vía callback. Muestra progreso y errores. Reset al éxito.

### `LeafletMap.tsx`
Mapa Leaflet con marker. Configurable: zoom, center, draggable marker. Acepta callback `onChange(lat, lng)`. Usado por `LocationPicker`.

### `LocationPicker.tsx`
Compuesto de `LeafletMap` + buscador (geocoding manual o address text). Permite al owner seleccionar coords del local. Persiste el value como lat/lng numéricos.

### `NotificacionesBell.tsx`
Campanita con contador `noLeidas`. Dropdown con la lista (`Notificacion[]`) + sección separada para `pedidosNuevos`. Hace `marcarLeida` al hacer click. Conectado al store `notificaciones`.

---

## Componentes de página

Algunos páginas exportan sus propios sub-componentes inline (no en `components/`) por estar fuertemente acoplados a la página:

- `app/DirectoryClient.tsx` — cards del directorio + filtros.
- `app/[slug]/LandingClient.tsx` — menú entero + carrito + checkout (~31 KB de TSX). Candidato a partir en sub-componentes (pendiente refactor).

## Convenciones

- **Props tipadas** con interfaces locales (no `React.FC<Props>` — desuso de React 18+).
- **Server Components** sin imports de `react` para hooks de cliente.
- **`'use client'`** la línea 1 cuando aplica.
- **Estilos** con Tailwind + `cn(...)` helper (`lib/utils.ts`) para condicionales.
- **Animaciones** con `motion.div` / `AnimatePresence` (framer-motion).
- **Accesibilidad**: inputs con `<label>`, modales con focus trap, botones con `disabled` real.

## Lo que no existe (pendiente)

- DataTable reutilizable (cada página tiene su propia tabla).
- Pagination component (cada página lleva su lógica de meta).
- Date picker (los rangos de fecha usan `<input type="date">` nativo).
- Loading boundaries con `<Suspense>` — hoy se hace con flag `loading` en cada page.

> Ya resueltos: toast con tipo `warning`/`neutral` (Toaster propio) y
> confirmación con diálogo de diseño (`ConfirmDialog`, reemplazó a `confirm()`).
