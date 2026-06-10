# Infra — Setup local con Docker

## Prerrequisitos

- Docker Desktop / Docker Engine + Docker Compose v2.
- 4 GB de RAM libres mínimo.
- Puertos libres: `3000`, `3307`, `8080`.

## Pasos (primera vez)

```bash
# 1. Clonar el repo
git clone <url> clicktoeat && cd clicktoeat

# 2. Copiar archivos de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# (opcional) cp .env.example .env

# 3. Levantar el stack
docker compose up -d --build

# 4. Esperar a que MySQL esté listo (5-15 s típico)
docker compose logs -f mysql   # ver healthcheck pasar

# 5. Bootstrapping de Laravel (sólo primera vez)
docker compose exec api composer install
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan storage:link
docker compose exec api php artisan l5-swagger:generate
```

## Verificar que todo levantó

| URL                                                            | Qué debes ver                                 |
|----------------------------------------------------------------|-----------------------------------------------|
| http://localhost:3000                                          | Directorio público con dos locales demo       |
| http://localhost:3000/tacos-el-gordo                           | Landing de Tacos El Gordo                     |
| http://localhost:3000/pizza-bambino                            | Landing de Pizza Bambino                      |
| http://localhost:3000/login                                    | Pantalla de login del panel                    |
| http://localhost:8080/api/v1/public/menu/tacos-el-gordo        | JSON del menú                                  |
| http://localhost:8080/api/documentation                        | Swagger UI                                      |

## Credenciales de demo

| Email                                       | Password      | Rol           |
|--------------------------------------------|---------------|---------------|
| `admin@ClickToEat.app`                      | `password123` | super_admin   |
| `owner+tacos-el-gordo@ClickToEat.app`        | `password123` | owner          |
| `owner+pizza-bambino@ClickToEat.app`         | `password123` | owner          |

## Día a día

```bash
docker compose up -d         # arrancar
docker compose down          # detener (mantiene volumen)
docker compose logs -f api   # ver logs Laravel
docker compose logs -f web   # ver logs Next.js
docker compose restart api   # reiniciar Laravel
```

## Re-seedear datos

```bash
docker compose exec api php artisan migrate:fresh --seed
```
⚠️ Destruye todos los datos del local.

## Tests PHPUnit

```bash
docker compose exec api vendor/bin/phpunit
# o un suite/test específico:
docker compose exec api vendor/bin/phpunit --filter=PedidoFlowTest
```

Los tests usan **sqlite in-memory**, no tocan la BD MySQL del compose.

## Regenerar Swagger

Si `L5_SWAGGER_GENERATE_ALWAYS=true` (default dev) no hace falta. Si quieres forzar:
```bash
docker compose exec api php artisan l5-swagger:generate
```

## Limpiar todo

```bash
docker compose down -v        # borra contenedores + volumen MySQL
docker system prune -af       # opcional: limpia imágenes huérfanas
```

## Troubleshooting

| Síntoma                                              | Causa probable                  | Fix                                                |
|------------------------------------------------------|---------------------------------|----------------------------------------------------|
| `http://localhost:3000` muestra "Connection refused" | Contenedor `web` aún instalando deps | `docker compose logs web` y esperar                |
| 502 Bad Gateway en `:8080`                           | `api` no arrancó                | `docker compose logs api`; revisa `.env` (key)     |
| `SQLSTATE: Access denied for user`                   | Credenciales BD desincronizadas | Revisa `apps/api/.env` vs `docker-compose.yml`     |
| `class App\... not found`                            | Falta autoload                   | `docker compose exec api composer dump-autoload`    |
| Cambios de migración no se reflejan                  | Falta correr migrate             | `docker compose exec api php artisan migrate`       |
| Imágenes subidas no se ven                           | Falta `storage:link`             | `docker compose exec api php artisan storage:link`  |
| `axios: Network Error` desde el frontend             | CORS o URL mal                   | Verifica `FRONTEND_URL` en `apps/api/.env`         |

## Alternativa sin Docker

Ver [`infra/wamp-native.md`](wamp-native.md).
