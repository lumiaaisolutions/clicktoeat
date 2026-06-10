# Infra — Docker Compose

`docker-compose.yml` en la raíz. 4 servicios.

## Servicios

### `api` — Laravel
- Build de `docker/php/Dockerfile` (PHP 8.3-fpm-alpine).
- Mount `./apps/api` → `/var/www/html`.
- Mount `./docker/php/php.ini` → `/usr/local/etc/php/conf.d/zz-clickeat.ini` (read-only).
- Variables: `DB_HOST=mysql`, `DB_PORT=3306`, `DB_DATABASE=clickeat`, `DB_USERNAME=clickeat`, `DB_PASSWORD=clickeat`.
- Depende de `mysql` (`service_healthy`).
- Sin puerto expuesto (sirve via php-fpm a nginx).

### `nginx` — reverse proxy
- Image `nginx:1.27-alpine`.
- Puerto `8080:80`.
- Mount `./apps/api` → `/var/www/html` (read-only).
- Mount `./docker/nginx/default.conf` → `/etc/nginx/conf.d/default.conf` (read-only).
- Configura fastcgi_pass a `api:9000`.
- Headers de seguridad: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- `client_max_body_size 25M`.
- Cache `expires 7d` para `jpg|jpeg|png|gif|ico|css|js|woff2?|svg`.

### `mysql`
- Image `mysql:8.0`.
- Command: `--default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`.
- Variables: `MYSQL_ROOT_PASSWORD=root`, `MYSQL_DATABASE=clickeat`, `MYSQL_USER=clickeat`, `MYSQL_PASSWORD=clickeat`.
- Puerto `3307:3306` (3307 host → 3306 contenedor, evita choque con MySQL local).
- Volumen named `mysql_data` para persistencia.
- Init: `docker/mysql/init.sql` crea `clickeat` y `clickeat_testing` y grants.
- Healthcheck: `mysqladmin ping` cada 5s, 20 reintentos.

### `web` — Next.js dev
- Image `node:20-alpine` (sin build custom).
- Command `sh -c "npm install && npm run dev"`.
- Mount `./apps/web` → `/app`.
- Variable: `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`.
- Puerto `3000:3000`.
- Depende de `nginx`.

## Red

Red bridge `clickeat`. Todos los servicios la usan. Permite que `api` resuelva `mysql` por nombre.

## Volúmenes

- `mysql_data` (named) — datos de MySQL persistentes.

## Comandos comunes

```bash
docker compose up -d --build              # primera vez
docker compose up -d                       # arranque normal
docker compose down                        # detiene contenedores
docker compose down -v                     # + borra volumen MySQL (wipe)

docker compose logs -f api                 # tail logs de api
docker compose exec api bash               # shell en api
docker compose exec api php artisan ...    # artisan
docker compose exec mysql mysql -u root -proot clickeat  # cli sql

docker compose restart api                 # restart sólo api
```

## Tareas de primera vez

```bash
docker compose exec api composer install
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan storage:link
docker compose exec api php artisan l5-swagger:generate
```

## Problemas comunes

### "Cannot resolve host: mysql" desde api
La red bridge no está. `docker compose down && docker compose up -d --build`.

### MySQL no arranca / healthcheck falla
- Verifica que el puerto 3307 no esté ocupado.
- `docker compose logs mysql` para ver el error.
- Si es corrupción del volumen: `docker compose down -v` (pierdes datos).

### Permisos en storage
`docker compose exec api chown -R www:www storage`.

### Permisos en composer.lock al usar Mac/Apple Silicon
A veces el mount de bind genera lock. `docker compose down && rm apps/api/composer.lock && docker compose up -d --build`.

## Healthchecks

Todos los servicios tienen healthcheck a partir de 2026-06-10. `depends_on` usa `condition: service_healthy` para arranque ordenado:

```
mysql (healthy) → api (healthy) → nginx (healthy) → web (healthy)
```

Detalle:

| Servicio | Test                                                              | Justificación                                                                |
|----------|-------------------------------------------------------------------|------------------------------------------------------------------------------|
| `mysql`   | `mysqladmin ping`                                                 | Listo desde inicio.                                                          |
| `api`     | `pgrep php-fpm: master && php-fpm -t`                              | php-fpm escucha sólo TCP fastcgi (no HTTP) — verificamos proceso + config.    |
| `nginx`   | `wget --spider http://localhost/up`                                | `/up` es el endpoint health de Laravel. Atraviesa toda la cadena nginx → php-fpm → Laravel. |
| `web`     | `wget --spider http://localhost:3000/`                             | Endpoint root de Next. `start_period: 120s` porque `next dev` tarda en arrancar la primera vez. |

> **Producción Hostinger**: estos healthchecks son para el stack Docker local de dev. En el servidor productivo (sin Docker) el monitoring se hace con un servicio externo tipo **UptimeRobot** / **BetterStack** / **Healthchecks.io** apuntando a:
> - `https://clicktoeat.lumiaaisolutions.com/` (frontend)
> - `https://clicktoeat-api.lumiaaisolutions.com/up` (Laravel `/up`)
>
> Ver [`infra/deploy-hostinger.md`](deploy-hostinger.md) para el setup productivo.

## Limitaciones del setup actual

- **Sin Dockerfile productivo del frontend** — el contenedor `web` corre `next dev`. Pendiente para Fase 5 (multi-stage build).
- **Secretos hardcodeados** (`MYSQL_ROOT_PASSWORD=root` en el compose) — aceptable en dev local; en prod NO se usa este compose.
- **Sin volumen para storage** de la app — si destruyes el contenedor api, pierdes `storage/app/public/uploads`. Usable en dev por bind mount; en prod Hostinger los uploads viven en el filesystem del servidor (ver [`infra/deploy-hostinger.md`](deploy-hostinger.md)).

Ver [`issues/devops-faltante.md`](../issues/devops-faltante.md).
