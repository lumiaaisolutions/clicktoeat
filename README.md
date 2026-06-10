# ClickToEat

> SaaS multi-tenant para que cada local de comida tenga su propia landing (`tudominio.com/{slug}`), su menú dinámico, y un botón directo a WhatsApp para recibir pedidos. Sin app del cliente, sin comisiones.

## Producción

| | |
|---|---|
| Frontend | https://clicktoeat.lumiaaisolutions.com |
| API | https://clicktoeat-api.lumiaaisolutions.com |
| Hosting | Hostinger Business Shared (Phoenix, AZ) |
| Documentación de deploy | [`docs/infra/deploy-hostinger.md`](docs/infra/deploy-hostinger.md) |

Deploy automatizado:
```bash
./scripts/deploy-api.sh    # rsync + composer + migrate + cache + health check
./scripts/deploy-web.sh    # next build + tar + scp + restart Passenger + health check
```

## Quickstart

### Con Docker (recomendado)

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

docker compose up -d --build

docker compose exec api composer install
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan storage:link
```

Detalles, troubleshooting y comandos: [`docs/infra/local-setup.md`](docs/infra/local-setup.md).

### Sin Docker (WAMP / nativo)

Ver [`docs/infra/wamp-native.md`](docs/infra/wamp-native.md).

## URLs

| URL                                                          | Qué es                        |
|--------------------------------------------------------------|-------------------------------|
| http://localhost:3000                                         | Directorio público             |
| http://localhost:3000/tacos-el-gordo                          | Landing demo                   |
| http://localhost:3000/login                                   | Panel admin                    |
| http://localhost:8080/api/v1/public/menu/tacos-el-gordo       | API pública                    |
| http://localhost:8080/api/documentation                       | Swagger UI                     |

## Credenciales demo

Ver [`docs/credenciales-demo.md`](docs/credenciales-demo.md).

## Documentación

Toda la documentación vive en [`docs/`](docs/README.md), fragmentada por contexto. Puntos de entrada:

- **Arquitectura** — [`docs/architecture/overview.md`](docs/architecture/overview.md)
- **Multi-tenancy** — [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md)
- **API** — [`docs/api/overview.md`](docs/api/overview.md)
- **Base de datos** — [`docs/database/schema.md`](docs/database/schema.md)
- **Features (pedidos, inventario, métricas, etc.)** — [`docs/features/`](docs/README.md#features)
- **Frontend** — [`docs/frontend/overview.md`](docs/frontend/overview.md)
- **Infra / DevOps** — [`docs/infra/`](docs/README.md#infra--devops)
- **Tests** — [`docs/testing/overview.md`](docs/testing/overview.md)
- **Cómo agregar un feature** — [`docs/contributing/how-to-add-feature.md`](docs/contributing/how-to-add-feature.md)
- **Issues y roadmap** — [`docs/issues/`](docs/README.md#issues-conocidos--lo-que-falta)

## Stack

| Capa     | Tech                                                                                   |
|----------|----------------------------------------------------------------------------------------|
| Backend  | Laravel 11 · PHP 8.3 · Sanctum (bearer) · Eloquent · MySQL 8 · L5-Swagger              |
| Frontend | Next.js 14 (App Router) · TypeScript estricto · TailwindCSS · Framer Motion · Zustand · Axios |
| Infra    | Docker Compose · nginx · php-fpm · mysql 8 · node 20                                   |

Detalle en [`docs/architecture/stack.md`](docs/architecture/stack.md).

## Estructura del repo

```
clicktoeat/
├── apps/
│   ├── api/             # Laravel 11 — multi-tenant
│   └── web/             # Next.js 14
├── docker/              # nginx, php-fpm, mysql
├── docs/                # Documentación fragmentada por contexto
├── bd/                  # Dump SQL (referencia — ver docs/database/migrations.md)
├── legacy-prototype/    # Prototipo JSX original (sólo referencia visual)
├── docker-compose.yml
└── README.md
```

## Licencia

Proprietary.
