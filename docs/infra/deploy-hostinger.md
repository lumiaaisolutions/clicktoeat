# Infra — Deploy a Hostinger (producción)

> Setup productivo actual. Última verificación: 2026-06-13.

## Resumen

| Componente | Detalle |
|-----------|---------|
| **Proveedor** | Hostinger |
| **Plan** | **VPS con CageFS** (panel: `hpanel.hostinger.com/vps/1698236/`) |
| **OS** | Ubuntu 24.04 LTS (template Hostinger) |
| **Servidor** | Phoenix, AZ — `srv1698236.hstgr.cloud` |
| **Panel** | hPanel |
| **Frontend** | https://clicktoeat.lumiaaisolutions.com (Next.js 14 standalone vía Passenger/lsnode) |
| **API** | https://clicktoeat-api.lumiaaisolutions.com (Laravel 11 + PHP 8.3.30) |
| **BD** | MySQL managed (localhost en el mismo servidor) |
| **Web server** | LiteSpeed (config vía `.htaccess` compat Apache) |
| **HTTPS** | Let's Encrypt (cert R13, renovación automática) |

> ⚠️ **VPS pero enjaulado**: aunque comercialmente es "VPS", el usuario SSH
> está dentro de **CageFS** — sin sudo real, sin `crontab`/`/etc/cron.d`, sin
> `apt`, sin ver procesos del host. Funcionalmente equivalente a Shared.
> No te engañe el nombre.

## SSH

| Campo | Valor |
|-------|-------|
| Host | `86.38.202.72` |
| Puerto | `65002` |
| Usuario | `u221820910` |
| Key (dev original) | `~/.ssh/hostinger_clicktoeat` |
| Key alternativa | `~/.ssh/id_ed25519` (también autorizada) |

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
# ó
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
```

Los scripts (`deploy-*.sh`, `backup-mysql.sh`) leen la key de la variable
`SSH_KEY` si está exportada. Si no, default `~/.ssh/hostinger_clicktoeat`:

```bash
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy-web.sh
```

## Rutas en servidor

| Recurso | Ruta absoluta |
|---------|---------------|
| API (Laravel) | `/home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/` |
| Frontend (Next standalone) | `/home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs/` |
| Uploads | `/home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/public/storage/uploads/` |
| Frames de hamburguesa (landing) | `/home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs/public/frames/burger/` |
| Logs deploy / backup | `/home/u221820910/logs/` |
| Scripts operativos | `/home/u221820910/scripts/` |
| Backups locales | `/home/u221820910/backups/` |
| Config de scripts | `/home/u221820910/.config/` |

> **Histórico**: `datos-deploy.md` mencionaba `/home/u221820910/nodejs/` como
> ruta del Frontend. **NO es correcta en este servidor** — el Frontend vive
> dentro de `~/domains/clicktoeat.lumiaaisolutions.com/nodejs/`. El script
> `deploy-web.sh` fue ajustado en junio 2026 con la ruta correcta.

## Base de datos

| Campo | Valor |
|-------|-------|
| Motor | MySQL (managed Hostinger) |
| Host | `localhost` (mismo servidor que la API) |
| Puerto | `3306` |
| Base | `u221820910_clicktoeat` |
| Usuario | `u221820910_clicktoeat` |
| Password | En el `.env` productivo (`/home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env`) |

⚠️ **Limitaciones del MySQL managed en Shared**:
- Sin privilegio para `--routines` / `--triggers` en `mysqldump` (requiere acceso a `mysql.proc`). El script de backup ya omite esos flags.
- Sin `SUPER` ni `RELOAD` privilege → operaciones administrativas (`FLUSH PRIVILEGES`, etc.) no disponibles desde la app.
- `OPTIMIZE TABLE` sí está permitido.

## Variables de entorno productivas (API)

Archivo `.env` en el servidor (fuera del repo). Resumen de los críticos:

```env
APP_NAME=ClickToEat
APP_ENV=production
APP_KEY=base64:<rotada-y-fuera-del-repo>
APP_DEBUG=false
APP_URL=https://clicktoeat-api.lumiaaisolutions.com

LOG_CHANNEL=stack
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u221820910_clicktoeat
DB_USERNAME=u221820910_clicktoeat
DB_PASSWORD=<secret>

SANCTUM_STATEFUL_DOMAINS=
SESSION_DOMAIN=

FRONTEND_URL=https://clicktoeat.lumiaaisolutions.com
PUBLIC_MENU_BASE_URL=https://clicktoeat.lumiaaisolutions.com

BROADCAST_CONNECTION=log
CACHE_STORE=database
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
SESSION_DRIVER=database
SESSION_LIFETIME=120

L5_SWAGGER_GENERATE_ALWAYS=false
```

## Variables productivas (Frontend)

`apps/web/.env.production` (versionado):

```env
NEXT_PUBLIC_API_URL=https://clicktoeat-api.lumiaaisolutions.com/api/v1
NODE_ENV=production
```

> **Pendiente**: agregar `NEXT_PUBLIC_APP_URL=https://clicktoeat.lumiaaisolutions.com` (para el generador de QR) y eliminar `NEXT_PUBLIC_GOOGLE_MAPS_KEY` que no se usa.

## Deploy

### API — automatizado con [`scripts/deploy-api.sh`](../../scripts/deploy-api.sh)

```bash
# Desde la raíz del repo en local
./scripts/deploy-api.sh
```

Hace: rsync (excluye .env, vendor, storage, etc.) → composer install --no-dev → migrate --force → caches productivos → health check.

### Frontend — automatizado con [`scripts/deploy-web.sh`](../../scripts/deploy-web.sh)

```bash
# Requiere `output: 'standalone'` en next.config.mjs (ya configurado)
./scripts/deploy-web.sh

# Si la build ya está hecha (de una corrida anterior):
./scripts/deploy-web.sh --skip-build

# Validar sin subir nada:
./scripts/deploy-web.sh --dry-run
```

Hace: `next build` → empaqueta `.next/standalone` + `.next/static` + `public`
(incluye los 168 frames de hamburguesa en `public/frames/burger/`) → scp →
extrae → `passenger-config restart-app` → health check.

#### Notas técnicas del script

1. **Staging directory**: el empaquetado usa `cp -R` a un staging dir y luego
   `tar -czf`, en lugar de `tar --transform` (que **no es soportado por
   BSD tar de macOS**). Funciona en macOS y Linux.

2. **Backup automático**: antes de extraer el nuevo build, el script renombra
   `.next` → `.next.previous` y `public` → `public.previous` para rollback
   instantáneo.

3. **Tamaño del tarball**: ~8 MB (incluye los 168 frames JPG de la
   `BurgerSequence` del landing, 4.3 MB) — sube en <30 s en conexión
   doméstica.

4. **xattrs de macOS**: tar emite warnings `Ignoring unknown extended
   header keyword 'LIBARCHIVE.xattr.com.apple.quarantine'` — son inocuos,
   el contenido se extrae bien.

5. **SSH key**: por default busca `~/.ssh/hostinger_clicktoeat`. Sobrescribir
   con `SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy-web.sh`.

### Manual (procedimiento histórico, si los scripts fallan)

#### API
```bash
# Local
scp -i ~/.ssh/hostinger_clicktoeat -P 65002 <archivo> \
  u221820910@86.38.202.72:/home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/<ruta>

# Servidor (vía SSH)
cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

#### Frontend
```bash
# Local
cd apps/web
NEXT_PUBLIC_API_URL=https://clicktoeat-api.lumiaaisolutions.com/api/v1 npm run build

# Staging dir (porque BSD tar no soporta --transform)
mkdir -p /tmp/web-stage/.next
cp -R .next/standalone/. /tmp/web-stage/
cp -R .next/static       /tmp/web-stage/.next/static
cp -R public             /tmp/web-stage/public
tar -czf /tmp/web-build.tar.gz -C /tmp/web-stage .

# Upload
scp -i ~/.ssh/id_ed25519 -P 65002 /tmp/web-build.tar.gz \
  u221820910@86.38.202.72:/home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs/

# Servidor
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
cd /home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs
[ -d .next ] && { rm -rf .next.previous; mv .next .next.previous; }
[ -d public ] && { rm -rf public.previous; mv public public.previous; }
tar -xzf web-build.tar.gz
rm -rf .next/cache
passenger-config restart-app . || touch tmp/restart.txt
```

## Storage de imágenes

| Campo | Valor |
|-------|-------|
| Tipo | Filesystem local (sin CDN, sin S3) |
| Escribe en | `public_html/public/storage/uploads/{banners,logos,productos}/` |
| Sirve desde | `https://clicktoeat-api.lumiaaisolutions.com/storage/uploads/...` |
| Tamaño actual | ~3 MB (al 2026-06-10) |
| Disco total servidor | 14 TB, 72% usado (compartido entre clientes del plan Shared) |

> Las uploads viven **fuera** de los excludes del rsync de deploy — no se sobrescriben al hacer deploy de la API.
>
> El `storage:link` típico de Laravel NO se usa: las uploads van directamente a `public/storage/uploads/` (escrito por el `ImageUploader`).

## Healthcheck

Laravel 11 expone `/up` por default (configurado en `bootstrap/app.php`).

```bash
curl -sf https://clicktoeat-api.lumiaaisolutions.com/up
# Devuelve HTML con CSS verde + "Application up" si todo OK
```

> Esto difiere del pendiente original (`/api/v1/health` — que no existe). Apuntar UptimeRobot a `/up` directamente; no crear endpoint custom redundante.

## Monitoreo externo recomendado (UptimeRobot u otro)

| Check | URL | Esperado | Frecuencia |
|------|-----|----------|------------|
| Frontend up | `https://clicktoeat.lumiaaisolutions.com/` | 200 | 1 min |
| API up | `https://clicktoeat-api.lumiaaisolutions.com/up` | 200 | 1 min |
| API datos | `https://clicktoeat-api.lumiaaisolutions.com/api/v1/public/locales` | 200 + body JSON con `.data` | 5 min |

Notificar a Slack (`#alertas-clicktoeat`) o email del on-call.

## Backups

### Backups nativos del VPS (hPanel)

Disponibles en hPanel → **VPS** → **Snapshots & Backups** (`/vps/<id>/backups`).

| Característica | Valor real (verificado 2026-06-13) |
|---|---|
| Frecuencia auto | **Semanal** (no diaria) |
| Retención | 2 snapshots rotando (más viejo + más reciente) |
| Restauración | **FULL del VM** — destructivo, no granular |
| Daily backups | Add-on de $6 USD/mes en hPanel |

⚠️ **Limitación crítica**: el botón "Restore" del panel **reemplaza todo el
servidor** (código, BD, configs, uploads). NO permite restaurar solo un
directorio. Si necesitas recuperar un archivo específico:

1. Mejor opción: extraerlo de un VPS temporal restaurando a otro server.
2. O confiar en el backup propio off-site (siguiente sección).

Ver [`runbook/recuperar-uploads-perdidos.md`](../runbook/recuperar-uploads-perdidos.md)
para el caso real que vivimos (junio 2026 — perdimos 7 imágenes por un rsync
sin excludes correctos; los snapshots de Hostinger eran semanales y el más
viejo ya no tenía esas fotos).

### Pendiente operativo principal: backup propio off-site

Los snapshots de Hostinger NO bastan para SLA serio porque son full-VM y
solo semanales. El plan es:

- **Script propio**: [`scripts/backup-mysql.sh`](../../scripts/backup-mysql.sh) (production-ready para Hostinger VPS/CageFS).
- **Upload off-site**: Backblaze B2 (o Wasabi) vía rclone standalone en `~/bin/`.
- **Cron diario** configurado desde hPanel (no `/etc/cron.d` — CageFS lo bloquea).
- **Dead-man switch** vía Healthchecks.io.
- **Pendiente**: extender el script para que también suba `storage/app/public/uploads/`
  (BD + uploads). Sin esto, no hay forma de recuperar imágenes individuales.

**Procedimiento de setup**: ver [`scripts/README.md`](../../scripts/README.md) → "Setup del backup en el servidor (primera vez)".

## LiteSpeed-specific notes

El stack usa LiteSpeed en lugar de nginx/Apache puros. Implicaciones:

- **Configuración de headers** no se hace en `nginx.conf` sino en `.htaccess` (LiteSpeed lee compatibilidad Apache) o vía configuración del hPanel.
- **PHP** corre como **LSPHP** (LiteSpeed PHP) — más eficiente que PHP-FPM tradicional. Sin tuning manual de pools.
- **Cache** built-in (LSCache) puede ayudar al frontend; no usar para endpoints autenticados.
- **Reinicio** de PHP/workers se hace desde hPanel o tocando archivos (`touch .htaccess` reinicia LSPHP).

Para headers de seguridad recomendados (HSTS, CSP, etc.) crear `.htaccess` en `public_html/`:

```apache
# Security headers (LiteSpeed compatible)
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(self)"
# CSP: ajustar según los assets reales del frontend
# Header always set Content-Security-Policy "default-src 'self'; ..."

# Bloquear acceso a archivos sensibles
<FilesMatch "^\.env|composer\.|package\.">
    Require all denied
</FilesMatch>
```

## Cron jobs disponibles en hPanel

| Frecuencia | Comando | Para qué |
|-----------|---------|----------|
| `0 3 * * *` | `/home/u221820910/scripts/backup-mysql.sh >> /home/u221820910/logs/backup.log 2>&1` | Backup diario MySQL → B2 |
| `* * * * *` (futuro) | `cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> /dev/null 2>&1` | Laravel scheduler (cuando se agreguen tareas) |
| `0 4 * * 0` (futuro) | `cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan sanctum:prune-expired --hours=720` | Cleanup tokens viejos (cuando se implemente expiración) |

Cómo agregar: **hPanel → Avanzado → Trabajos Cron → Crear nuevo**.

## Pendientes operativos (de `datos-deploy.md`)

- [ ] **Configurar backup automático de MySQL** — script listo (`scripts/backup-mysql.sh`), falta deploy + setup B2 + cron. Ver [`scripts/README.md`](../../scripts/README.md).
- [ ] **Configurar monitoreo externo** — UptimeRobot apuntando a `/up` (no `/api/v1/health` — no existe). Ver sección "Monitoreo externo recomendado".
- [ ] **Automatizar deploy** — scripts listos (`scripts/deploy-api.sh`, `scripts/deploy-web.sh`). Pendiente: integrarlos a CI (Fase 5 del plan de mejoras).
- [ ] **Evaluar CDN o almacenamiento externo para uploads** — hoy filesystem local (3 MB no es crítico, pero al escalar sí). Ver [`ADR-006`](../decisions/ADR-006-uploads-locales-interim.md).

## Otros pendientes derivados del setup actual

- [ ] **Verificar `output: 'standalone'`** en `apps/web/next.config.mjs` — necesario para que `deploy-web.sh` funcione. Si no está, agregar.
- [ ] **Agregar `.htaccess`** con headers de seguridad (ver sección LiteSpeed). Hoy probablemente faltan — confirmar y arreglar.
- [ ] **Decidir rotación de `APP_KEY`** — runbook listo en [`runbook/rotar-app-key.md`](../runbook/rotar-app-key.md).
- [ ] **Agregar `NEXT_PUBLIC_APP_URL`** al `.env.production` del frontend.
- [ ] **Eliminar `NEXT_PUBLIC_GOOGLE_MAPS_KEY`** del `.env.production` del frontend (no se usa).
- [ ] **Confirmar quota exacta** del plan Hostinger Business (CPU/RAM/disco/bandwidth/cron count).

## Rollback

### API
```bash
git checkout <commit-anterior>
./scripts/deploy-api.sh --skip-tests --skip-migrate
```

Si la migración nueva debe revertirse:
```bash
ssh ... 'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan migrate:rollback --step=1 --force'
```

### Frontend
`deploy-web.sh` hace backup automático antes de extraer. Rollback rápido:

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 '
cd /home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs
rm -rf .next public
mv .next.previous .next
mv public.previous public
touch tmp/restart.txt
'
```

## Si todo falla (modo mantenimiento)

```bash
ssh ... 'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan down --message="Mantenimiento" --retry=60'
```

API responde 503 con `Retry-After: 60`. Para reactivar:
```bash
ssh ... 'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan up'
```
