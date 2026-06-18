# POS con cantidad, listas como cards, tours, sucursales, emails sin etiquetas, auditoría visual — 2026-06-18

Sesión grande, 7 fases. Cambios de UX en todo el sistema.

## Fase A — POS: agregar producto con cantidad y opciones

`apps/web/src/app/admin/punto-venta/page.tsx`:

### Selector de categoría como dropdown

Junto a los chips (que se cortan en mobile con muchas categorías), agrego
un `<select>` con "Todas las categorías" + opción por cada categoría
activa. Filtra exactamente igual que los chips, comparte el state
`activeCat`.

### Modal "Agregar al pedido" (reemplaza click directo)

Antes: tap en card = agrega 1 al carrito, sin manera de elegir cantidad
ni ver opciones. Ahora: tap abre `AgregarProductoModal` con:

- Foto + descripción del producto
- Precio unitario destacado
- Si tiene **extras/toppings**: bloque amarillo listándolos. Para POS
  rápido no son seleccionables — el owner cobra el extra en efectivo
  aparte. (Para que el cliente elija opciones, usa la landing.)
- Selector +/− con input numérico (1-99)
- Subtotal vivo del producto
- Botón "Agregar al pedido" o "Agregar N al pedido"

### Indicadores visuales en cards

Cada card de producto en el catálogo POS ahora muestra:
- Badge "Opciones" amarillo si el producto tiene extras
- Contador "×N" arriba a la derecha si ya está en el carrito
- Botón "+" prominente al pie de la card (antes era click implícito)

## Fase B — Rediseñar lista de pedidos como cards

`apps/web/src/app/admin/pedidos/page.tsx`:

La lista plana tipo tabla (cada pedido en una fila estrecha) se
transforma en **grid responsivo de cards**:

- 1 columna en mobile, 2 en desktop
- Avatar circular con iniciales del cliente + color según estado
- Nombre del cliente + badge estado uppercase
- Folio mono + teléfono debajo
- Total grande en negrita a la derecha + método de entrega en uppercase
- Línea separadora con metadata + botones de acción (Estado, Calificación,
  Borrar)
- Hover: shadow-soft + borde más oscuro

Nuevo map `ESTADO_AVATAR` con colores suaves (50 saturation) para los
avatares — más claros que los badges de estado para no competir
visualmente.

## Fase C — Tours actualizados

`apps/web/src/components/help/tours.ts`:

- **pedidos**: 5 pasos (antes 2). Cubre estado, calificación, borrar.
- **punto-venta**: 5 pasos (antes 2). Cubre dropdown categoría, modal de
  agregar, cobrar, offline.
- **branding**: 4 pasos (antes 3). Agregado paso "¿Tienes servicio a
  domicilio?" que explica el toggle.
- **sucursales** (nuevo): 2 pasos. Explica que es feature Premium y cómo
  pedir alta de sucursal nueva.

## Fase D — Sidebar: ítem "Sucursales" con candado

### Sidebar

`apps/web/src/app/admin/layout.tsx` agrega en sección Configuración:

```ts
{
  href: '/admin/sucursales',
  label: 'Sucursales',
  icon: 'store',
  ownerOnly: true,
  feature: 'multi_sucursal',
  requiredPlan: 'premium',
}
```

- Si el plan tiene `multi_sucursal` → link normal.
- Si no → candado + modal de upgrade al hacer click (lógica reutilizada
  de los otros items con feature gate).

### Página /admin/sucursales

`apps/web/src/app/admin/sucursales/page.tsx` (nueva):

Por ahora informativa — el backend ya soporta multi-local nativamente,
falta UI de alta self-service. La página muestra:

- 3 cards de beneficios (una cuenta varias sucursales, reportes
  consolidados, branding heredado)
- CTA "Abrir solicitud de soporte" + "Escribir por WhatsApp" para que
  el owner pida alta

Cuando hagamos UI self-service, este placeholder se reemplaza por la
lista de sucursales del owner.

## Fase E — Super_admin: editar nombre/correo del owner

### Backend

Nuevo endpoint `PATCH /api/v1/admin/users/{user}/profile`:

```php
public function updateUserProfile(User $user, Request $request): JsonResponse
{
    if (! $request->user()?->isSuperAdmin()) abort(403);
    $data = $request->validate([
        'nombre' => ['required', 'string', 'max:120'],
        'email'  => ['required', 'email', 'max:160',
            Rule::unique('users', 'email')->ignore($user->id)],
    ]);
    $emailCambio = $user->email !== $data['email'];
    $user->update($data);
    if ($emailCambio) $user->tokens()->delete(); // forzar re-login
    return response()->json(['data' => ..., 'sessions_revoked' => $emailCambio]);
}
```

Throttle 30/min. Auto-revoke de Sanctum tokens si el email cambia.

### Frontend

`/admin/locales/[id]/usuarios/page.tsx` agrega nueva sección
"Editar datos del owner" con `EditarOwnerForm` que muestra:

- Input "Nombre completo"
- Input "Correo electrónico" con hint sobre cierre de sesiones
- Botón "Guardar cambios" deshabilitado si no hay cambios

Sincroniza state local tras éxito (sin recargar página). Toast distinto
según si el email cambió o no.

## Fase F — Emails: eliminar etiquetas técnicas

`apps/web/src/app/admin/email-templates/page.tsx`:

### Fuera el bloque amarillo de variables

Antes: panel amarillo grande con códigos tipo `{{ nombre_local }}` que
intimidaba al owner no técnico. Reemplazado por una pista corta neutra:

> "Al editar un correo, podrás insertar datos del cliente, del pedido o
> del local con un toque desde la barra de 'Insertar dato'."

### Botones de insertar en el cursor

Dentro del `EditorModal`, antes del textarea del mensaje:

- Barra "Insertar dato en el asunto" o "Insertar dato en el mensaje"
  (cambia según el campo enfocado)
- Botones tipo chip con `+` + el nombre humano ("Nombre del cliente",
  "Total del pedido", etc.) — sin sintaxis técnica
- Al click, inserta el token correspondiente **exactamente donde está el
  cursor** (no al final). Funciona con `Field` (subject) y `Textarea`
  (body) usando refs `forwardRef`.

Implementación clave:

```ts
const subjectRef = useRef<HTMLInputElement | null>(null);
const bodyRef    = useRef<HTMLTextAreaElement | null>(null);
const [focused, setFocused] = useState<'subject' | 'body'>('body');

const insertarVar = (token: string) => {
  const el = focused === 'subject' ? subjectRef.current : bodyRef.current;
  const start = el.selectionStart ?? value.length;
  const end   = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  });
};
```

El backend sigue renderizando los `{{ tokens }}` como antes — solo el
UX cambió.

## Fase G — Auditoría: timeline visual

`apps/web/src/app/admin/auditoria/page.tsx` reescrito:

### Fuera la tabla, en su lugar timeline

- **Agrupado por día** con etiquetas humanas: "Hoy", "Ayer",
  "lun 16 de junio". Cada grupo dentro de una card.
- **Cada acción**:
  - Avatar circular del actor con iniciales + color según rol
    (violet = super_admin, emerald = owner, zinc = staff/sistema)
  - Nombre + badge de rol + badge de acción coloreado por tipo
  - Texto: "{actor} {verbo} {tipo} #{id} · local #{id}" — léible
  - Email del actor en gris pequeño
  - Hora a la derecha (tabular-nums)

### Chips de filtro

Arriba del listado: chips "Todas / Creado / Editado / Borrado /
Restaurado" con icono + color que coincide con los badges. Click
filtra en el client (sin nueva request, todo lo que cargó el endpoint).

### Mapa de metadata

```ts
const ACTION_META = {
  created:  { label: 'Creó',     verb: 'creó',     icon: 'plus',    badgeCls: 'bg-emerald-50 ...' },
  updated:  { label: 'Editó',    verb: 'editó',    icon: 'palette', badgeCls: 'bg-amber-50 ...' },
  deleted:  { label: 'Borró',    verb: 'borró',    icon: 'x',       badgeCls: 'bg-red-50 ...' },
  restored: { label: 'Restauró', verb: 'restauró', icon: 'history', badgeCls: 'bg-blue-50 ...' },
};
```

Helper `humanizeSubject` mapea `App\Models\Producto` → "Producto", etc.

## Archivos tocados

```
apps/api/app/Http/Controllers/Api/PasswordController.php        # +updateUserProfile
apps/api/routes/api.php                                          # +PATCH users/{user}/profile
apps/web/src/app/admin/auditoria/page.tsx                        # timeline visual
apps/web/src/app/admin/email-templates/page.tsx                  # botones insertar
apps/web/src/app/admin/layout.tsx                                # +Sucursales sidebar
apps/web/src/app/admin/locales/[id]/usuarios/page.tsx            # +EditarOwnerForm
apps/web/src/app/admin/pedidos/page.tsx                          # cards en lugar de tabla
apps/web/src/app/admin/punto-venta/page.tsx                      # modal agregar + dropdown cat
apps/web/src/app/admin/sucursales/page.tsx                       # nuevo (placeholder)
apps/web/src/components/help/tours.ts                            # tours actualizados
```

## Verificación

- ✅ 189/189 phpunit verde
- ✅ TypeScript estricto OK
- ✅ Next.js build OK sin warnings
