# CLAUDE.md

> Contexto del proyecto para Claude Code (y cualquier agente o nuevo dev que aterrice acá).

## ⚠️ El sistema está EN PRODUCCIÓN

| | |
|---|---|
| Frontend | https://clicktoeat.lumiaaisolutions.com (Next.js standalone, **PM2** proceso `clicktoeat-web`, puerto 3004) |
| API | https://clicktoeat-api.lumiaaisolutions.com (Laravel 11 + **PHP 8.4-fpm**) |
| Hosting | Hostinger **VPS dedicado** KVM 2 (`srv1698236.hstgr.cloud`) — migrado 2026-08-07 desde el shared hosting viejo (ya dado de baja). **Compartido con otros productos LUMIA en vivo** (`lumia-hq`, `lumia-portal`, `lumina-restaurante`, Docker `tradetrove-*`/`n8n`/`ollama`) |
| SSH | `ssh -p 8080 deploy@2.24.123.93` (key `~/.ssh/id_ed25519`; root bloqueado; `deploy` tiene sudo passwordless) |
| BD | MySQL 8 local (`127.0.0.1:3306`, BD `u221820910_clicktoeat` — nombre heredado) |
| Web server | **Nginx** (config por sitio en `/etc/nginx/sites-available/`) + certbot/Let's Encrypt |
| API root | `/var/www/clicktoeat/api/` |
| Uploads | `/var/www/clicktoeat/api/storage/app/public/uploads/` (symlink `public/storage` → `storage/app/public`) |
| Backups | `backup-mysql.sh` vía cron real del VPS (03:00 UTC, log en `/var/www/clicktoeat/logs/backup.log`) — retención local; off-site B2 opcional sin configurar |
| IA (Clicky) | Ollama self-hosted en el mismo VPS (`localhost:11434`, el mismo que usa n8n) — `CLICKY_PROVIDER=ollama`; Gemini queda de alterno |

**Cualquier cambio que afecte runtime de prod**: leer [`docs/infra/deploy-hostinger.md`](docs/infra/deploy-hostinger.md) primero. Scripts de deploy + rollback en [`scripts/`](scripts/).

**Deploy automatizado** (sustituye al scp manual):
```bash
./scripts/deploy-api.sh   # rsync + composer + migrate + cache + health check
./scripts/deploy-web.sh   # next build + tar + scp + pm2 restart + health check
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

### Billing / Stripe / planes

- ❌ **Nunca** crees una Stripe Checkout Session sin `client_reference_id` cuando quien la inicia ya tiene sesión (usuario o local existente). Sin eso, `session()`/el webhook no pueden vincular el resultado y crean un **Local huérfano duplicado** con su propia suscripción Stripe real cobrando por separado (incidente real, jun/jul 2026 — ver [`docs/runbook/postmortems/2026-07-06-locales-huerfanos-stripe.md`](docs/runbook/postmortems/2026-07-06-locales-huerfanos-stripe.md)). Patrón: `'local:'.$id` o `'user:'.$id`.
- ❌ **Nunca** leas `plan_status` directo para decidir si un local "tiene plan activo". Usa siempre `Local::hasActivePlan()` — es la única función que además compara `trial_ends_at` en tiempo real; el cron diario (`trials:expire-manual`) es un respaldo async, no la fuente de verdad (ver [`docs/runbook/postmortems/2026-07-06-trial-expiry-not-enforced.md`](docs/runbook/postmortems/2026-07-06-trial-expiry-not-enforced.md)).

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

### VPS Hostinger (post-migración 2026-08-07) — reglas reales

El sistema vive en un **VPS real** (Ubuntu 24.04, root vía `deploy` + sudo),
NO en el shared hosting con CageFS de antes (dado de baja). Reglas:

- ⚠️ **El VPS es compartido con otros productos LUMIA en producción**
  (`lumia-hq`, `lumia-portal`, `lumina-restaurante`, Docker `tradetrove-*`,
  `n8n`, `ollama`). Cualquier acción a nivel sistema (reiniciar `php8.4-fpm`
  o nginx, `apt install`, tocar `/etc/`) puede afectarlos — **confirmar con
  el usuario antes** de tocar algo que no sea exclusivo de ClickToEat/ClickToShop.
- ❌ **No hay Docker para ClickToEat en prod.** El `docker-compose.yml` es dev local. (Sí hay contenedores Docker de OTROS productos en el VPS — no tocarlos.)
- ✅ **Crons reales** con `crontab -e` del usuario `deploy` (no tocar las líneas de `lumia-hq-cron.sh`). Backup MySQL ya corre a las 03:00 UTC.
- ✅ **Node corre con PM2** (`pm2 restart clicktoeat-web`, puerto 3004). Sobrevive reboots vía `pm2-deploy.service`.
- ✅ **PHP 8.4-fpm** compartido con otros sitios del VPS — reiniciarlo requiere confirmación del usuario.
- ✅ **Nginx** por sitio en `/etc/nginx/sites-available/`; siempre `sudo nginx -t` antes de `reload`.
- ✅ **HTTPS** certbot con renovación automática (systemd timer).
- ✅ **Healthcheck** está en `/up` (Laravel 11 default), NO en `/api/v1/health`. Monitoreo externo: UptimeRobot (4 monitores web/api de ambos proyectos).
- ✅ **Ollama** corre en `localhost:11434` (lo usa n8n y ahora Clicky vía `CLICKY_PROVIDER=ollama`) — sin API key ni cuota.
- ⚠️ **DNS**: los 4 subdominios tienen registros `A` → `2.24.123.93` en la zona de `lumiaaisolutions.com`. Ojo: borrar un "Website" en el hPanel shared puede arrastrarse el registro DNS (incidente 2026-08-07).
- Detalle completo: [`docs/infra/deploy-hostinger.md`](docs/infra/deploy-hostinger.md).

### Uploads de imágenes

- Disk `public` de Laravel → escribe a `storage/app/public/uploads/`.
- `public/storage` es **symlink** a `storage/app/public/` (estándar Laravel).
- Nginx sirve `/storage/uploads/...` siguiendo el symlink.
- `deploy-api.sh` excluye **ambos paths** del rsync — uploads jamás se tocan por deploy.
- Si las imágenes desaparecen tras deploy: ver [`docs/runbook/recuperar-uploads-perdidos.md`](docs/runbook/recuperar-uploads-perdidos.md).

### Paridad ClickToEat ↔ ClickToShop (regla persistente)

**ClickToShop (`../clicktoshop/`) es el proyecto hermano**: mismo stack,
misma arquitectura, distinto dominio (tiendas en vez de restaurantes).
Las features de plataforma deben mantenerse **a la par** en ambos —
como se hizo con Clicky (asistente IA + tours) y con el provider Ollama:

- Si implementas o cambias una feature de plataforma aquí (IA/Clicky,
  billing, auth, infra de deploy, CI, seguridad), **replica el cambio en
  clicktoshop adaptando solo el contexto de dominio** (copys, módulos,
  branding) — y viceversa.
- Si un cambio NO se puede portar en la misma sesión, déjalo registrado
  como pendiente explícito en el cierre de sesión de AMBOS repos.
- Lo específico del dominio (recetas/inventario de comida vs. catálogo de
  tienda) no se fuerza a la par.

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
