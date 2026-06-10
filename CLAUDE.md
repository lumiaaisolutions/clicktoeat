# CLAUDE.md

> Contexto del proyecto para Claude Code (y cualquier agente o nuevo dev que aterrice acá).

## ⚠️ El sistema está EN PRODUCCIÓN

| | |
|---|---|
| Frontend | https://clicktoeat.lumiaaisolutions.com |
| API | https://clicktoeat-api.lumiaaisolutions.com |
| Hosting | Hostinger **Business Shared** (Phoenix, AZ — `us-phx-web943.main-hosting.eu`) |
| SSH | `ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72` |
| BD | MySQL managed (`localhost`, BD `u221820910_clicktoeat`) |
| Web server | **LiteSpeed** (no nginx/Apache) — config via `.htaccess` |
| Node runtime | **Passenger** (`lsnode`) en `/home/u221820910/nodejs/` |

**Cualquier cambio que afecte runtime de prod**: leer [`docs/infra/deploy-hostinger.md`](docs/infra/deploy-hostinger.md) primero. Scripts de deploy + rollback en [`scripts/`](scripts/).

**Deploy automatizado** (sustituye al scp manual):
```bash
./scripts/deploy-api.sh   # rsync + composer + migrate + cache + health check
./scripts/deploy-web.sh   # next build + tar + scp + restart Passenger + health check
```

## Qué es

**ClickToEat** — SaaS multi-tenant para que cada local de comida tenga su propia landing pública (`tudominio.com/{slug}`), reciba pedidos por WhatsApp con un mensaje pre-armado, y administre su catálogo / inventario / pedidos desde un panel.

- Sin app del cliente.
- Sin comisiones por pedido.
- Los pedidos viajan al WhatsApp del local vía deep-link `wa.me/<num>?text=...` — sin API de Meta.

## Stack

- **Backend**: Laravel 11 (PHP 8.3), Sanctum bearer tokens, Eloquent, MySQL 8, L5-Swagger.
- **Frontend**: Next.js 14 App Router, TypeScript estricto, Tailwind 3, Zustand 4, Axios, Framer Motion, Leaflet.
- **Infra**: Docker Compose (nginx + php-fpm + mysql 8 + node 20).

## Estructura

```
clicktoeat/
├── apps/api/             # Laravel 11
├── apps/web/             # Next.js 14
├── docker/               # nginx, php, mysql configs
├── bd/                   # Dump SQL (referencia — outdated, ver docs/database/)
├── docs/                 # Documentación fragmentada por contexto
├── legacy-prototype/     # Prototipo JSX (sólo referencia visual)
├── docker-compose.yml
└── README.md             # Portada thin que apunta a docs/
```

**Entrada a la documentación**: [`docs/README.md`](docs/README.md). Está fragmentada por contexto (architecture, api, database, features, models, frontend, infra, testing, issues, contributing, decisions, runbook, security, user-guides).

## Comandos típicos

### Docker
```bash
docker compose up -d --build
docker compose exec api composer install
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan storage:link
docker compose exec api vendor/bin/phpunit
docker compose exec api vendor/bin/pint
```

### Nativo
```bash
cd apps/api && php artisan serve --port=8080
cd apps/web && npm run dev
```

### Tests
```bash
docker compose exec api vendor/bin/phpunit                          # full suite
docker compose exec api vendor/bin/phpunit --filter=PedidoFlowTest  # un test class
cd apps/web && npm run typecheck && npm run lint
```

## Reglas críticas — "no toques X"

### Multi-tenancy
- ❌ **Nunca** uses `DB::table('productos')` — salta el `TenantScope`. Usa `Producto::query()`.
- ❌ **Nunca** uses `withoutGlobalScopes()` o `withoutTenantScope()` sin acompañarlo de un `where('local_id', $id)` explícito.
- ❌ **No** quites el `singleton(TenantContext::class)` del `AppServiceProvider` — sin singleton el scope no filtra y se filtran datos entre locales.
- Cualquier modelo nuevo con columna `local_id` debe usar el trait `App\Models\Concerns\BelongsToTenant`.

Ver [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md) y [`docs/decisions/ADR-001-single-db-tenancy.md`](docs/decisions/ADR-001-single-db-tenancy.md).

### Pedidos / inventario
- `OrderService::crear` y `InventoryService::descontarParaPedido` **deben** correr dentro de `DB::transaction`. El service tiene un guard `LogicException` si no.
- Si cambias el formato del mensaje WhatsApp en `App\Services\WhatsApp\WhatsAppLinkBuilder`, **debes** actualizar el espejo TS en `apps/web/src/lib/whatsapp.ts` (y viceversa). Test cubre el formato del backend; el del frontend está pendiente.
- `detalle_pedidos` es **snapshot** de `producto_nombre`/`precio_unitario`/`extras_seleccionados` — no recalcules contra el producto vivo (rompe el histórico). Ver [`ADR-004`](docs/decisions/ADR-004-snapshot-en-detalle-pedidos.md).

### Migraciones
- Tests corren con **sqlite in-memory**. Si tu migración toca `enum`, `change()` de columna o usa SQL raw específico de MySQL, **protege** con guard:
  ```php
  if (DB::connection()->getDriverName() !== 'mysql') return;
  ```
- Migraciones reformistas: usar `Schema::hasColumn(...)` para idempotencia.
- Nunca editar migraciones ya aplicadas — crea una nueva.

### Validación y respuesta
- **Toda** validación pasa por un FormRequest (`apps/api/app/Http/Requests/`). `Model::unguard()` está activo global → sin FormRequest no hay segunda red.
- **Toda** respuesta JSON pasa por un Resource (snake_case interno; camelCase sólo en `Public/MenuResource` y `MenuController::show` — ver [`ADR-003`](docs/decisions/ADR-003-snake-vs-camelcase-en-api.md)).
- Todo controller debe `$this->authorize(...)` o el FormRequest debe `$user->can(...)`.

### Env / secretos
- ❌ **No commitees** `apps/api/.env` (está en `.gitignore`).
- ❌ **No** rotes el `APP_KEY` sin coordinar — afecta sesiones activas. Runbook: [`docs/runbook/rotar-app-key.md`](docs/runbook/rotar-app-key.md).
- Para configurar Cloudinary/S3/Sentry: variables van a `apps/api/.env`, **no** al `.env.example` raíz (que es sólo para variables públicas del Next.js).

### Documentación
- **Cualquier .md** nuevo va a `docs/<carpeta-temática>/` — nunca consolidar temas distintos en un solo archivo. Es regla persistente del proyecto.
- Si agregas un endpoint → documentar en `docs/api/*.md` correspondiente.
- Si agregas/cambias una columna → actualizar `docs/database/schema.md`.
- Si tomas una decisión arquitectónica grande → ADR en `docs/decisions/`.

### Hostinger Business Shared — restricciones
El plan productivo es **Shared**, no VPS. Asume lo siguiente:
- ❌ **No hay Docker en prod.** El `docker-compose.yml` es para dev local únicamente.
- ❌ **No hay sudo, ni systemctl, ni /etc/cron.d.** Crons se gestionan desde **hPanel → Trabajos Cron**.
- ❌ **No se pueden instalar paquetes** con apt/yum. Para herramientas extras (`rclone`, etc.) → binarios standalone en `~/bin/`.
- ❌ **El usuario MySQL no tiene `SUPER`, `RELOAD`, `--routines`, `--triggers`**. `mysqldump` debe usar `--no-tablespaces`, sin routines/triggers.
- ✅ **PHP corre como LSPHP** (LiteSpeed PHP). Restart de workers con `touch .htaccess` o desde hPanel.
- ✅ **Node corre con Passenger** (`lsnode`). Restart con `passenger-config restart-app /path` o `touch tmp/restart.txt`.
- ✅ **Headers de seguridad** se configuran en `.htaccess` (LiteSpeed lee sintaxis Apache), no en nginx.
- ✅ **HTTPS** Let's Encrypt auto-renovado por Hostinger (no requiere acción).
- ✅ **Healthcheck** está en `/up` (Laravel 11 default), NO en `/api/v1/health`.

## Convenciones de naming

| Capa             | Patrón                                         |
|-----------------|------------------------------------------------|
| Tabla BD        | snake_case plural (`detalle_pedidos`)           |
| Modelo Eloquent | PascalCase singular (`DetallePedido`)            |
| Controller      | `<Nombre>Controller`                            |
| FormRequest     | `<Verbo><Nombre>Request`                        |
| Resource        | `<Nombre>Resource`                              |
| Policy          | `<Nombre>Policy`                                 |
| Service         | sustantivo (`OrderService`, `MetricasService`)   |
| TS type/interface| PascalCase, sin prefijo `I`                     |
| TS hook         | `use<Nombre>`                                    |
| Componente React | PascalCase                                       |
| CSS theme       | tailwind utilities; vars con prefix `--ce-`     |

## Reglas de oro de comportamiento (a Claude / a otro dev)

1. **Lee antes de escribir.** Verifica el estado actual antes de proponer cambios.
2. **Verifica antes de recomendar.** Si una recomendación cita un archivo/función/flag, comprueba que existe AHORA.
3. **Cambios mínimos.** No refactorices alrededor del cambio pedido.
4. **No agregues comentarios obvios.** Comenta el "por qué", nunca el "qué".
5. **No agregues error handling para casos que no pueden pasar.** Confía en framework guarantees.
6. **Migración: ¿funciona en sqlite?** Si no, guard.
7. **Endpoint nuevo: ¿está testeado el isolation multi-tenant?** Si no, escribe el test.
8. **Cambiar README/.env.example/composer.json/docker-compose.yml** → cuidado, son superficiales y rompen onboarding fácil.

## Demo data

Seeders crean (idempotente por email):
- `admin@ClickToEat.app` / `password123` — super_admin
- `owner+tacos-el-gordo@ClickToEat.app` / `password123` — owner del slug `tacos-el-gordo`
- `owner+pizza-bambino@ClickToEat.app` / `password123` — owner del slug `pizza-bambino`

URLs locales:
- http://localhost:3000 — directorio
- http://localhost:3000/{slug} — landing pública
- http://localhost:3000/login — panel admin
- http://localhost:8080/api/v1/* — API
- http://localhost:8080/api/documentation — Swagger UI

## Donde leer más

- Arquitectura: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- Multi-tenancy: [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md)
- API: [`docs/api/overview.md`](docs/api/overview.md)
- Cómo agregar un feature: [`docs/contributing/how-to-add-feature.md`](docs/contributing/how-to-add-feature.md)
- Issues / pendientes: [`docs/issues/`](docs/README.md#issues-conocidos--lo-que-falta)
- Decisiones de arquitectura: [`docs/decisions/`](docs/README.md#decisiones-de-arquitectura-adrs)
- Runbooks operativos: [`docs/runbook/`](docs/README.md#runbooks)
