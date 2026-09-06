# Rediseño de autenticación (login + registro)

> Estado: **Fase 1 (visual) implementada y en producción.** Fase 2 (carrusel
> editable desde el panel) pendiente. Aplica igual en ClickToShop (paridad).

## Qué cambió

Login (`/login`) y registro (`/registro`) pasan de una tarjeta centrada simple
a un layout **split-screen** de dos columnas dentro de una tarjeta blanca
flotante sobre un fondo con malla de gradiente de marca:

- **Izquierda — formulario.** Se conserva 100% la lógica y los campos
  existentes (email/contraseña + 2FA en login; nombre/email/contraseña/confirmar
  en registro). El botón primario pasa a **gradiente de marca**
  (`#F26A1F → #FF8A47` en ClickToEat) con sombra e interacción
  (`hover:brightness-105`, `active:scale`).
- **Derecha — carrusel de valor.** Tarjeta con gradiente, chips de features,
  cita grande, fuente/rol, flechas prev/next, indicadores de progreso,
  auto-avance cada 6 s y enlace **"Visitar sitio"**. Oculto en móvil
  (`hidden lg:block`) → en móvil se ve solo el formulario, a ancho completo.

## Componente

`apps/web/src/components/auth/AuthShell.tsx` — wrapper reutilizable. Recibe el
formulario como `children` y renderiza el fondo, el enlace "Volver al inicio",
el carrusel por defecto y el `LumiaBadge` al pie. Un único componente sirve a
login y registro.

Las slides por defecto (`DEFAULT_SLIDES`) son **propuestas de valor reales de
la plataforma** (sin comisiones, menú en un link, panel simple) — no se usan
testimonios de personas ficticias.

## Decisiones (confirmadas con el usuario)

- **Alcance:** primero visual (esta fase) + deploy; luego editable.
- **Gestión del carrusel:** configuración **global super-admin** (una sola
  configuración para toda la plataforma, no por local). Pendiente Fase 2.

## No se hizo (a propósito)

- **No** se agregaron botones de login social (Google/Facebook/Apple): el
  backend no soporta OAuth, así que serían botones falsos. Si en el futuro se
  agrega OAuth real, van en la columna del formulario.

## Fase 2 — pendiente (carrusel editable)

- Modelo/tabla de config global (`auth_carousel` o similar) con slides
  (imagen opcional, tags, cita, fuente, rol, orden, activo).
- Endpoints super-admin (`GET/PUT /api/v1/admin/auth-carousel`) + subida de
  imágenes al disk `public`.
- Sección en el panel super-admin para editar slides y subir imágenes.
- `AuthShell` consume la config (fetch público de solo lectura) con fallback a
  `DEFAULT_SLIDES`.

## Archivos tocados

- `apps/web/src/components/auth/AuthShell.tsx` (nuevo)
- `apps/web/src/app/login/page.tsx` (refactor a `AuthShell`)
- `apps/web/src/app/registro/page.tsx` (refactor a `AuthShell`)
