# Onboarding — rediseño (junio 2026)

Pulido completo del flow de onboarding post-checkout para que sea más
intuitivo, menos técnico y permita revisar/corregir.

## Cambios vs versión anterior

### 1. URL pública sin input editable

**Antes**: `Paso 2 · Tu local` tenía 3 inputs: Nombre, **URL pública (slug)**
editable, Eslogan. El user tenía que entender qué era un "slug" y editarlo.

**Ahora**: solo Nombre + Eslogan. La URL se genera automática del nombre y
se muestra como label de solo-lectura:

```
URL
clicktoeat.lumiaaisolutions.com/tacos-el-gordo
Se crea automática a partir del nombre.
```

El slug se envía al backend silenciosamente (sigue siendo requerido por la
API, pero el user no tiene que pensarlo).

### 2. Color sin código hex visible

**Antes**: input `<input type="color">` + input de texto `#FF2D2D` que el
user podía teclear.

**Ahora**: grid de 8 paletas pre-hechas (ClickToEat, Postres, Italiana,
Cafetería, Sushi, Vegana, Bar, Pastelería) con borde verde + check cuando
están activas. Debajo, un botón "Color personalizado" que abre el picker
nativo del browser sin mostrar nunca el código hex.

### 3. Contacto con mapa + geolocalización

**Antes**: `Paso 4 · Cómo te contactan` tenía solo input de texto para
WhatsApp y dirección.

**Ahora**: WhatsApp + **LocationPicker** (componente reusado de `/admin/branding`)
que ofrece:
- Mapa Leaflet con marcador draggable
- Botón "Encontrar ubicación aproximada" (usa `navigator.geolocation`)
- Search box que llama a Nominatim para buscar direcciones
- Coordenadas `lat`/`lng` capturadas automáticamente

### 4. Paso "Resumen" antes de finalizar

**Nuevo**: tras completar los 4 pasos, aparece `Paso 5 · Revisa todo` con
cards por sección. Cada card tiene un botón "Editar" que salta al step
correspondiente.

### 5. Botón "Atrás" en cada paso

**Nuevo**: chip "← Atrás" arriba del título en todos los pasos menos el
primero y el final. Permite corregir sin perder lo escrito (estado
persistido al parent del wizard).

## Estructura

```typescript
const STEPS = ['password', 'local', 'branding', 'contacto', 'resumen', 'finalizar'];

interface OnboardingData {
  password: { nombre, email, password };
  local:    { nombre, slug, tagline };
  branding: { color_primario, logo_url, banner_url };
  contacto: { whatsapp, direccion, lat, lng };
}
```

El estado se eleva al componente padre `OnboardingClient`. Cada step recibe
`data[seccion]` + `onChange` para hidratar/persistir. El backend recibe el
mismo payload que antes en cada step — el cambio es 100% UX.

## Archivos modificados

- `apps/web/src/app/onboarding/OnboardingClient.tsx` (reescrito completo)

## Reutilización

El `LocationPicker` se reusó de `apps/web/src/components/admin/LocationPicker.tsx`
sin modificaciones. Ya soportaba geolocalización + Nominatim search + marker
draggable.
