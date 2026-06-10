# Arquitectura — Stack y dependencias

## Runtime

| Componente | Versión          | Dónde se define                          |
|-----------|------------------|------------------------------------------|
| PHP       | 8.3              | `apps/api/composer.json` + `docker/php/Dockerfile` |
| Laravel   | 11.x             | `apps/api/composer.json`                  |
| MySQL     | 8.0              | `docker-compose.yml` + `docker/mysql/init.sql` |
| Node      | 20 (LTS)         | `docker-compose.yml` (`node:20-alpine`)    |
| Next.js   | 14.2.15          | `apps/web/package.json`                    |
| TypeScript| 5.6              | `apps/web/package.json`                    |
| nginx     | 1.27-alpine      | `docker-compose.yml`                       |

## Backend — dependencias

### Producción (`apps/api/composer.json`)

| Paquete                     | Para qué                                        |
|-----------------------------|-------------------------------------------------|
| `laravel/framework` ^11      | Núcleo del framework                            |
| `laravel/sanctum` ^4         | Personal access tokens (bearer)                  |
| `laravel/tinker` ^2          | REPL                                            |
| `darkaonline/l5-swagger` ^8.6| Genera OpenAPI 3.0 desde anotaciones `@OA\*`   |
| `spatie/laravel-permission` ^6 | **Declarada pero no usada.** Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md) |

### Desarrollo

| Paquete                       | Para qué                  |
|-------------------------------|---------------------------|
| `fakerphp/faker`              | Datos sintéticos          |
| `laravel/pint`                | PHP linter/formatter      |
| `mockery/mockery`             | Mocks en tests            |
| `nunomaduro/collision`        | UX de errores en CLI      |
| `phpunit/phpunit` ^11         | Test runner               |
| `spatie/laravel-ignition`     | Pantalla de error en dev  |

### Extensiones PHP requeridas

Definidas en `docker/php/Dockerfile`:

`pdo_mysql`, `bcmath`, `zip`, `intl`, `gd` (con freetype + jpeg), `opcache`, `pcntl` + `oniguruma`, `libzip`, `icu`, `libpng`, `libjpeg-turbo`, `freetype` a nivel sistema, `mysql-client`.

## Frontend — dependencias

### Producción (`apps/web/package.json`)

| Paquete             | Versión   | Para qué                                |
|---------------------|-----------|-----------------------------------------|
| `next`              | 14.2.15   | App Router + SSR + ISR                  |
| `react` / `react-dom` | ^18.3.1 | UI                                       |
| `typescript`        | ^5.6.3    | Tipado                                   |
| `axios`             | ^1.7.7    | HTTP client (con interceptors Sanctum)   |
| `zustand`           | ^4.5.5    | State (auth, cart, toasts, notificaciones) |
| `framer-motion`     | ^11       | Animaciones del landing                  |
| `tailwindcss`       | ^3.4.13   | Estilos                                  |
| `clsx` + `tailwind-merge` | —    | `cn()` helper                            |
| `leaflet` + `react-leaflet` | ^1.9 / ^5 | Mapa para escoger ubicación del local |
| `qrcode` (+ `@types/qrcode`) | ^1.5 | Generar QR del menú                      |

> **Mapas:** se carga Google Maps API en `apps/web/.env.local` (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`) pero la implementación usa **Leaflet** (gratuita, sin API key necesaria). Pendiente: documentar o limpiar el env var.

### Dev

ESLint 9 + `eslint-config-next` 14, autoprefixer, postcss.

## Servicios externos esperados

| Servicio   | Estado actual                                                |
|-----------|--------------------------------------------------------------|
| WhatsApp  | Sólo deep-link `wa.me/<num>?text=<msg>` — sin Business API   |
| Cloudinary | **Mencionado en README pero no integrado.** El uploader real escribe al disco `public` local. Ver [`issues/discrepancias-readme.md`](../issues/discrepancias-readme.md) |
| Email     | `MAIL_*` no configurado. No hay reset por email.              |
| Pagos online | No hay (los métodos de pago son etiquetas para el mensaje) |
| WebSockets| `BROADCAST_CONNECTION=log`. Las notificaciones usan polling cada 30s |

## Configuración crítica de Laravel

- `Model::shouldBeStrict(!production)` — accesos a relaciones no cargadas explotan en dev (`AppServiceProvider`).
- `Model::unguard()` — fillable se vuelve opcional. La validación queda en los FormRequests.
- `URL::forceScheme('https')` en producción.
- Rate limiter `api` por user_id o IP (60/min) — sobreescrito por grupo `throttle:60,1` en `routes/api.php`.
