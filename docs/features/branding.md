# Feature — Branding / personalización del local

Cada local tiene su propia identidad visual aplicada a la landing pública.

## Campos persistidos (`locales`)

| Campo               | Tipo            | Default                  |
|--------------------|-----------------|--------------------------|
| `nombre`            | varchar          |                           |
| `tagline`           | varchar          |                           |
| `logo_url`          | varchar          |                           |
| `banner_url`        | varchar          |                           |
| `color_primario`    | varchar(9)        | `#FF2D2D`                  |
| `color_secundario`  | varchar(9)        | `#0B0B0F`                  |
| `color_fondo`       | varchar(9)        | `#FAFAF7`                  |
| `tipografia`        | varchar(255)     | `Bricolage Grotesque`      |
| `dark_mode`         | tinyint           | `false`                    |
| `redes_sociales`    | json              | `{ ig, fb, tt, wapp }`      |

## Endpoint

`PATCH /api/v1/local` — `UpdateBrandingRequest`. Acepta cualquier subset de los campos.

Validaciones notables:
- Colores: regex `/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/` (con alfa opcional).
- `whatsapp`: regex `[0-9+]+` (10-20 chars).
- `redes_sociales.*`: handles cortos (no URLs completas, las arma el frontend).

## Aplicación en la landing

`GET /public/menu/{slug}` devuelve un sub-objeto `branding`:
```json
{
  "branding": {
    "logo": "...", "banner": "...",
    "colorPrimario": "...", "colorSecundario": "...", "colorFondo": "...",
    "tipografia": "Bricolage Grotesque",
    "darkMode": false
  }
}
```

El frontend lo inyecta vía **CSS custom properties** en el root del componente landing (`apps/web/src/app/[slug]/LandingClient.tsx`):

```css
:root {
  --ce-accent: var(--color_primario);
  --ce-ink:    var(--color_secundario);
  --ce-bg:     var(--color_fondo);
}
```

`tailwind.config.ts` mapea las clases (`bg-bg`, `text-ink`, `bg-accent`) a esas CSS vars. Resultado: cambiar `color_primario` en BD aplica al instante (siguiente fetch).

## Fuente tipográfica

`tipografia` es un nombre legible (`"Bricolage Grotesque"`, `"Geist"`, etc.). El layout raíz (`apps/web/src/app/layout.tsx`) precarga `Bricolage Grotesque` y `Geist` desde Google Fonts. Otros fonts requieren agregarlos al `<link>` o configurarlos en la landing.

## Logo / banner

Suben por `POST /uploads/image` (ver [`features/uploads.md`](uploads.md)) y persisten `logo_url`/`banner_url` en `locales`. La columna `logo_public_id`/`banner_public_id` **no existe** todavía — los borrados de archivo no se hacen al reemplazar (TODO).

## Redes sociales

JSON estructurado:
```json
{ "ig": "tacosgordo", "fb": "TacosElGordoMX", "tt": "tacosgordo", "wapp": "5215512345678" }
```

El frontend arma URLs (`https://instagram.com/<handle>`, etc.). Validar URL no es necesario por ahora — sólo se valida que sea un string corto.

## Modo oscuro

`dark_mode: true` añade `class="dark"` al wrapper de la landing. Tailwind está configurado con `darkMode: 'class'`. Hoy los componentes tienen estilos dark sólo a medias — pendiente terminar.

## Vista previa

Página: `apps/web/src/app/admin/branding/page.tsx`. Side-by-side form ↔ preview de la landing usando los datos del local en vivo (debounced).

## Pendientes

- Borrado automático del logo/banner viejo al subir uno nuevo (similar a productos).
- Validar contraste mínimo entre `color_primario` y `color_fondo` (accesibilidad).
- Galería de fonts predefinidas (no escribir libre).
- Generar **favicon** dinámico desde el logo.
- Generar **OG image** automática con nombre del local.

## Feedback visual de selección (junio 2026)

Bug histórico: al elegir una plantilla / paleta / fuente, la vista previa se
actualizaba pero el botón seleccionado no tenía indicador visible — el owner
no sabía cuál estaba activo.

Fix: las 3 secciones ahora usan el mismo patrón visual:

- **Borde verde** (`border-emerald-500`) cuando activo
- **Anillo emerald** (`ring-emerald-200`) por afuera
- **Check circle** absoluto arriba a la derecha con icono `check`
- **Fondo emerald-50/60** en el área de label
- `aria-pressed={active}` para lectores de pantalla

Aplicado en `apps/web/src/components/admin/BrandingEditor.tsx`:
- Plantillas (línea ~184)
- Paletas sugeridas (línea ~236 — antes ni siquiera detectaba active)
- Tipografía (línea ~278)

## Vista previa: banner del local

Hasta junio 2026 la vista previa no mostraba el banner del local porque mezclaba
`backgroundImage` (CSS) con `<img>` y el navegador renderizaba uno encima del
otro inconsistentemente.

Fix: ahora usa `<img>` puro con `object-cover` y animación `kenburns` (zoom
sutil al hover). El banner refleja exactamente lo que el cliente verá.
