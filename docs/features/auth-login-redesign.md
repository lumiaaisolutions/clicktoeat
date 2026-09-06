# Rediseño de autenticación (login + registro)

> Estado: **Fase 1 (visual) + Fase 2 (carrusel editable) implementadas y en
> producción.** Aplica igual en ClickToShop (paridad).

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

## Fondo (splash suave)

El fondo de página **no** es un color de marca saturado a pantalla completa
(saturaba demasiado). Es un **splash de color suave** con blobs radiales
tenues que degrada verticalmente hacia crema/casi-blanco
(`linear-gradient(180deg, #F7CDAD → #FAE7D8 → #FBF4EE)` en ClickToEat;
lavanda→blanco en ClickToShop). La tarjeta blanca y el carrusel de color
quedan como los elementos vivos; el fondo solo los acompaña. El link "Volver
al inicio" usa texto oscuro sobre pastilla `white/70` para leerse sobre el
fondo claro.

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

## Fase 2 — carrusel editable (implementada)

Configuración **global de plataforma** (super_admin), no multi-tenant.

- **Tabla** `auth_carousel_slides` (sin `local_id`): `orden`, `activo`,
  `imagen_url` (nullable), `tags` (json), `quote`, `source`, `role`.
  Migración `2026_09_06_120000_create_auth_carousel_slides_table.php`.
- **Modelo** `App\Models\AuthCarouselSlide` — casts `activo:boolean`,
  `tags:array`. NO usa `BelongsToTenant`.
- **Endpoints**:
  - Público (solo lectura, activos ordenados):
    `GET /api/v1/public/auth-carousel` → `Api\Public\AuthCarouselController`.
  - Super-admin CRUD (`auth:sanctum` + `super_admin`):
    `GET/POST /api/v1/admin/auth-carousel`,
    `PATCH/DELETE /api/v1/admin/auth-carousel/{slide}`,
    `POST /api/v1/admin/auth-carousel/upload` (imagen, reusa `ImageUploader`,
    folder `auth-carousel`) → `Api\Admin\AuthCarouselController`.
- **Panel**: `apps/web/src/app/admin/carrusel-login/page.tsx` — lista, crea,
  edita, borra slides; sube imagen; toggle activo; campo orden. Solo visible
  para super_admin (`NAV_SUPER` → sección "Operación" → "Carrusel login").
- **Frontend**: `AuthShell` hace `fetch` público del carrusel al montar; si
  devuelve ≥1 slide activo los usa, si no cae a `DEFAULT_SLIDES`. Si un slide
  trae `imagen_url`, se renderiza de fondo con scrim para legibilidad.

## Archivos tocados

Backend:
- `database/migrations/2026_09_06_120000_create_auth_carousel_slides_table.php`
- `app/Models/AuthCarouselSlide.php`
- `app/Http/Controllers/Api/Admin/AuthCarouselController.php`
- `app/Http/Controllers/Api/Public/AuthCarouselController.php`
- `routes/api.php` (rutas pública + super-admin)
- `tests/Feature/AuthCarouselTest.php`

Frontend:
- `apps/web/src/components/auth/AuthShell.tsx` (nuevo + fetch remoto)
- `apps/web/src/app/login/page.tsx` (refactor a `AuthShell`)
- `apps/web/src/app/registro/page.tsx` (refactor a `AuthShell`)
- `apps/web/src/app/admin/carrusel-login/page.tsx` (nuevo — panel super-admin)
- `apps/web/src/app/admin/layout.tsx` (item de nav)
