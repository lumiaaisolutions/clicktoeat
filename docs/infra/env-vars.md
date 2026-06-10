# Infra — Variables de entorno

Catálogo de variables consumidas por la app. Tres archivos principales:

- `apps/api/.env` (Laravel; copia de `.env.example`)
- `apps/web/.env.local` (Next.js; copia de `.env.local.example`)
- `.env.example` raíz (compartidas / Docker — actualmente incluye claves de Cloudinary que no se usan)

## Backend (Laravel)

### App

| Variable             | Default                       | Uso                                                       |
|---------------------|-------------------------------|-----------------------------------------------------------|
| `APP_NAME`            | `ClickToEat`                   | UI / mails                                                |
| `APP_ENV`             | `local`                        | Switch dev/prod                                            |
| `APP_KEY`             | obligatoria                    | Encripción/cookies. **Generar con `php artisan key:generate`** |
| `APP_DEBUG`           | `true`                         | Falso en prod                                              |
| `APP_TIMEZONE`        | `America/Mexico_City`          | TZ default                                                 |
| `APP_URL`             | `http://localhost:8080`        | URLs absolutas, asset()                                    |
| `APP_LOCALE`          | `es`                           | Locale por default                                          |

### Base de datos

| Variable        | Default               |
|----------------|-----------------------|
| `DB_CONNECTION` | `mysql`                 |
| `DB_HOST`       | `127.0.0.1` (nativo) / `mysql` (Docker) |
| `DB_PORT`       | `3306`                  |
| `DB_DATABASE`   | `clicktoeat` (nativo) / `clickeat` (Docker) — **inconsistente** |
| `DB_USERNAME`   | `root` (nativo) / `clickeat` (Docker) |
| `DB_PASSWORD`   | vacío (nativo) / `clickeat` (Docker) |

### Sanctum / CORS / Sesión

| Variable                     | Default                       | Uso                                                  |
|-----------------------------|-------------------------------|------------------------------------------------------|
| `SANCTUM_STATEFUL_DOMAINS`    | vacío                          | Vacío = sólo bearer tokens. **No setear si Next está en otro dominio** |
| `SESSION_DOMAIN`              | vacío                          | Idem                                                 |
| `FRONTEND_URL`                | `http://localhost:3000`        | Whitelist CORS                                        |
| `SESSION_DRIVER`              | `database`                     | Backing en BD                                          |

### Caché / Queue / Filesystem / Logs

| Variable               | Default                         |
|-----------------------|---------------------------------|
| `CACHE_STORE`           | `database`                       |
| `QUEUE_CONNECTION`      | `database` (sin workers reales)  |
| `BROADCAST_CONNECTION`  | `log` (sin pusher/reverb)         |
| `FILESYSTEM_DISK`       | `local` (uploads van a `public` via storage:link) |
| `LOG_CHANNEL`           | `stack`                          |
| `LOG_LEVEL`             | `debug`                          |

### L5-Swagger

| Variable                         | Default                                  |
|---------------------------------|------------------------------------------|
| `L5_SWAGGER_GENERATE_ALWAYS`     | `true` (regenera spec en cada request)    |
| `L5_SWAGGER_CONST_HOST`          | `http://127.0.0.1:8080/api/v1`             |

### Otros

| Variable                | Uso                                              |
|------------------------|--------------------------------------------------|
| `PUBLIC_MENU_BASE_URL`   | URL pública para QR (default = `FRONTEND_URL`)    |
| `MAIL_*`                 | No configurado. Sin emails saliendo.              |
| `CLOUDINARY_*`           | **No usado** (declarado en `.env.example` raíz). El uploader actual es local. |

## Frontend (Next.js)

Sólo variables `NEXT_PUBLIC_*` están disponibles en el cliente.

| Variable                          | Default                            | Uso                                       |
|----------------------------------|------------------------------------|-------------------------------------------|
| `NEXT_PUBLIC_API_URL`              | `http://localhost:8080/api/v1`     | Base de axios y `fetchMenu`                |
| `NEXT_PUBLIC_APP_URL`              | `http://localhost:3000`            | URL para QR, OG, etc.                      |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY`      | (set en `.env.local`)               | **Declarado pero el mapa usa Leaflet (libre)** — pendiente limpiar |
| `NODE_ENV`                         | `production` en prod                | next start                                 |

## Pendientes

- Eliminar `CLOUDINARY_*` del `.env.example` raíz (o implementar Cloudinary).
- Unificar nombre BD entre Docker compose (`clickeat`) y `apps/api/.env` (`clicktoeat`).
- Quitar `NEXT_PUBLIC_GOOGLE_MAPS_KEY` si no se va a usar.
- Documentar `MAIL_*` cuando se implemente reset por email.
- Rotar `APP_KEY` actual (está commiteada en `apps/api/.env` — debería sólo estar en `.env.example` vacía).

Ver [`issues/discrepancias-readme.md`](../issues/discrepancias-readme.md).
