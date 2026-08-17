# Infra — Deploy a Hostinger (producción)

> Setup productivo actual. Última verificación: 2026-08-07.
>
> ⚠️ **Migración completada 2026-08-07**: el sistema se movió del hosting
> compartido (`86.38.202.72`, cuenta `u221820910`) a un **VPS dedicado**
> (`2.24.123.93`). Ver
> [`runbook/migracion-vps-dedicado-2026-08-06.md`](../runbook/migracion-vps-dedicado-2026-08-06.md)
> para el detalle completo de la migración, decisiones tomadas e incidentes.
> El host viejo sigue encendido como rollback (no recibe tráfico) hasta
> confirmar estabilidad del VPS nuevo por unos días.

## Resumen

| Componente | Detalle |
|-----------|---------|
| **Proveedor** | Hostinger |
| **Plan** | VPS KVM 2 (panel: `hpanel.hostinger.com/vps/1698236/`) — **compartido con otros productos LUMIA** (`lumia-hq`, `lumia-portal`, `lumina-restaurante`, contenedores Docker `tradetrove-*`/`n8n`/`ollama`) |
| **OS** | Ubuntu (hostname `srv1698236.hstgr.cloud`) |
| **Frontend** | https://clicktoeat.lumiaaisolutions.com (Next.js 14 standalone, PM2, proceso `clicktoeat-web`, puerto 3004) |
| **API** | https://clicktoeat-api.lumiaaisolutions.com (Laravel 11 + PHP 8.4-fpm) |
| **BD** | MySQL 8 local en el mismo servidor (`127.0.0.1:3306`) |
| **Web server** | Nginx (config por sitio en `/etc/nginx/sites-available/`) |
| **HTTPS** | Let's Encrypt vía certbot (renovación automática por systemd timer) |

> ✅ **VPS real, no CageFS**: a diferencia del host viejo, este VPS tiene
> `sudo` real (passwordless para el usuario `deploy`), `crontab -e`
> funcional, `apt`, y visibilidad de todos los procesos del servidor. Pero
> ojo: **es compartido con otros productos LUMIA en vivo** — cualquier
> cambio a nivel de sistema (reinicio de `php8.4-fpm`, nginx, instalación
> de paquetes) puede afectarlos. Confirmar con el usuario antes de tocar
> algo que no sea exclusivamente de ClickToEat/ClickToShop.

## SSH

| Campo | Valor |
|-------|-------|
| Host | `2.24.123.93` |
| Puerto | `8080` |
| Usuario | `deploy` (root SSH está bloqueado — `AllowUsers deploy` en `sshd_config.d`) |
| Key | `~/.ssh/id_ed25519` (ya autorizada en el servidor) |
| Sudo | Passwordless (`deploy` está en el grupo `sudo`) |

```bash
ssh -p 8080 deploy@2.24.123.93
```

Los scripts (`deploy-*.sh`, `rollback-web.sh`, `backup-mysql.sh`) leen la
key de la variable `SSH_KEY` si está exportada. Default: `~/.ssh/id_ed25519`.

## Rutas en servidor

| Recurso | Ruta absoluta |
|---------|---------------|
| API (Laravel) | `/var/www/clicktoeat/api/` |
| Frontend (Next standalone) | `/var/www/clicktoeat/web/` |
| Uploads | `/var/www/clicktoeat/api/storage/app/public/uploads/` (symlink `public/storage` → `storage/app/public`) |
| Config nginx | `/etc/nginx/sites-available/clicktoeat.lumiaaisolutions.com` (web), `/etc/nginx/sites-available/clicktoeat-api.lumiaaisolutions.com` (API) |
| Certificados SSL | `/etc/letsencrypt/live/clicktoeat.lumiaaisolutions.com/`, `/etc/letsencrypt/live/clicktoeat-api.lumiaaisolutions.com/` |
| Logs PM2 | `pm2 logs clicktoeat-web` (no hay archivo de log fijo por default — usar el comando) |

Todo el directorio `/var/www/clicktoeat/` es propiedad de `deploy:www-data`
(modo 775) — no hace falta `sudo` para escribir ahí. `/var/www` en sí es
`root:root`, por eso crear nuevos directorios ahí sí requiere `sudo`.

## Base de datos

| Campo | Valor |
|-------|-------|
| Motor | MySQL 8 (local, no managed) |
| Host | `127.0.0.1` |
| Puerto | `3306` |
| Base | `u221820910_clicktoeat` (nombre heredado de la cuenta vieja, no se renombró) |
| Usuario | `u221820910_clicktoeat` (mismas credenciales que en el host viejo — copiadas tal cual en la migración) |
| Password | En el `.env` productivo (`/var/www/clicktoeat/api/.env`) |
| Root MySQL | Sin password, acceso vía `sudo mysql` (root del sistema operativo, no expuesto por red) |

A diferencia del MySQL managed del host viejo, este SÍ soporta
`--routines`/`--triggers` en `mysqldump` y tiene privilegios `SUPER`/`RELOAD`
— pero el proyecto no usa routines/triggers, así que no cambia nada en la
práctica.

## Variables de entorno productivas (API)

Archivo `.env` en el servidor (fuera del repo, no tocado por el `rsync` de
deploy). Los valores clave no cambiaron respecto al host viejo excepto que
ya no hace falta rotar nada — se copió el `.env` original en la migración:

```env
APP_URL=https://clicktoeat-api.lumiaaisolutions.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=u221820910_clicktoeat
DB_USERNAME=u221820910_clicktoeat
DB_PASSWORD=<secret — igual al del host viejo>
FRONTEND_URL=https://clicktoeat.lumiaaisolutions.com
```

## Variables productivas (Frontend)

`apps/web/.env.production` (versionado) — sin cambios por la migración:

```env
NEXT_PUBLIC_API_URL=https://clicktoeat-api.lumiaaisolutions.com/api/v1
NODE_ENV=production
```

## Deploy

### API — automatizado con [`scripts/deploy-api.sh`](../../scripts/deploy-api.sh)

```bash
./scripts/deploy-api.sh
```

Hace: rsync (excluye `.env`, `vendor/`, `storage/app/public/`, etc.) →
`composer install --no-dev` → `migrate --force` → caches productivos →
health check (`GET /up`).

### Frontend — automatizado con [`scripts/deploy-web.sh`](../../scripts/deploy-web.sh)

```bash
./scripts/deploy-web.sh
./scripts/deploy-web.sh --skip-build   # build ya hecho
./scripts/deploy-web.sh --dry-run      # validar sin subir nada
```

Hace: `next build` → empaqueta `.next/standalone` + `.next/static` +
`public` → `scp` → extrae en `/var/www/clicktoeat/web/` → **`pm2 restart
clicktoeat-web`** (reemplaza el `passenger-config restart-app` del host
viejo) → health check.

#### Notas técnicas del script

1. **Staging directory + `cp -R .next/standalone/.`** (con el `/.` al
   final): el standalone build de Next.js incluye su propio `.next/`
   interno con `BUILD_ID` — sin el `/.` final, `cp -R` no copia ese
   subdirectorio oculto y el deploy falla con *"Could not find a production
   build"*. Bug real encontrado durante la migración (ver runbook), ya
   corregido en el script.
2. **Backup automático**: antes de extraer, el script renombra `.next` →
   `.next.previous` y `public` → `public.previous` para rollback
   instantáneo con [`scripts/rollback-web.sh`](../../scripts/rollback-web.sh).
3. **PM2, no Passenger**: el proceso corre como `clicktoeat-web` bajo PM2
   (`pm2 list` para ver todos los procesos del VPS, incluye los de otros
   productos LUMIA — no tocar esos). `pm2 save` ya está configurado con
   `pm2-deploy.service` (systemd) para resucitar todo tras un reboot del VPS.

## Storage de imágenes

| Campo | Valor |
|-------|-------|
| Tipo | Filesystem local (sin CDN, sin S3) |
| Escribe en | `/var/www/clicktoeat/api/storage/app/public/uploads/{banners,logos,productos}/` |
| Sirve desde | `https://clicktoeat-api.lumiaaisolutions.com/storage/uploads/...` (symlink `public/storage` → `storage/app/public`, estándar Laravel — a diferencia del host viejo que escribía directo a `public/storage/uploads/`) |

> Las uploads están excluidas del `rsync` de `deploy-api.sh` — no se
> sobrescriben en cada deploy. Se migraron manualmente (tar.gz) durante la
> migración de agosto 2026.

## Healthcheck

```bash
curl -sf https://clicktoeat-api.lumiaaisolutions.com/up
```

## SSL / certificados

Emitidos con certbot durante la migración (2026-08-07), válidos hasta
2026-11-05, auto-renovación por systemd timer (ya confirmado activo desde
antes en este VPS, usado por los otros productos LUMIA).

Para renovar/reemitir manualmente:
```bash
sudo certbot certonly --nginx -d clicktoeat.lumiaaisolutions.com -d www.clicktoeat.lumiaaisolutions.com \
  --non-interactive --agree-tos -m <email>
sudo certbot install --cert-name clicktoeat.lumiaaisolutions.com --nginx --non-interactive
sudo nginx -t && sudo systemctl reload nginx
```

`certbot install` requiere que el `server_name` del server block en
`/etc/nginx/sites-available/` liste **todos** los dominios del certificado
(incluyendo `www`) — si falta uno, falla con *"Could not automatically find
a matching server block"*. Agregarlo a mano y reintentar.

## Cron jobs

A diferencia del host viejo (hPanel → "Trabajos Cron" únicamente), este VPS
tiene `crontab -e` real. Configurar ahí directamente:

```bash
crontab -e
# 0 3 * * *  /var/www/clicktoeat/scripts/backup-mysql.sh >> /var/www/clicktoeat/logs/backup.log 2>&1
```

## Pendientes operativos post-migración

- [x] **Cron de backup activado** (2026-08-07) — `crontab -e` en el VPS
  corre [`scripts/backup-mysql.sh`](../../scripts/backup-mysql.sh) diario
  a las 03:00 UTC. Modo **local-only** (sin cuenta B2, cero costo) —
  dump + gzip + manifest sha256 en `~/backups/`, retención 14 días. Para
  off-site real hace falta que el usuario cree su propia cuenta Backblaze
  B2 (free tier) y setee `B2_REMOTE`/`B2_BUCKET` en
  `~/.config/clicktoeat-backup.env`.
- [ ] **Actualizar monitoreo externo** (UptimeRobot u otro) para apuntar a
  las mismas URLs de siempre — no cambian, así que probablemente no
  requiere acción, pero confirmar.
- [ ] **Decidir qué hacer con el host viejo** (`86.38.202.72`) — mantenerlo
  pausado como rollback unos días, luego decidir si se da de baja o se
  reutiliza para otro producto.
- [ ] **Validar un login real con sesión** (Sanctum) de un usuario real de
  negocio sobre el VPS nuevo — no se pudo completar en la migración por no
  tener credenciales reales a mano; los health checks y la conectividad a
  BD sí se verificaron.

## Rollback

### API
```bash
git checkout <commit-anterior>
./scripts/deploy-api.sh --skip-tests --skip-migrate
```

Si la migración nueva debe revertirse:
```bash
ssh -p 8080 deploy@2.24.123.93 'cd /var/www/clicktoeat/api && php artisan migrate:rollback --step=1 --force'
```

### Frontend
```bash
./scripts/rollback-web.sh
```

O manualmente:
```bash
ssh -p 8080 deploy@2.24.123.93 '
cd /var/www/clicktoeat/web
rm -rf .next public
mv .next.previous .next
mv public.previous public
pm2 restart clicktoeat-web
'
```

### Rollback del cutover de DNS completo (volver al host viejo)

Si el VPS nuevo tiene un problema grave y hay que volver al host viejo
temporalmente: en `hpanel.hostinger.com/websites/clicktoeat.lumiaaisolutions.com`
→ Advanced → DNS Zone Editor (tab "Subdomains"), borrar el registro `A @` /
`A www` que apunta a `2.24.123.93` y recrear el `ALIAS @` /`CNAME www` hacia
`clicktoeat.lumiaaisolutions.com.cdn.hstgr.net` (el mecanismo original del
Node.js App Hosting de Hostinger). El host viejo sigue funcionando sin
cambios, listo para recibir tráfico de nuevo.

## Si todo falla (modo mantenimiento)

```bash
ssh -p 8080 deploy@2.24.123.93 'cd /var/www/clicktoeat/api && php artisan down --message="Mantenimiento" --retry=60'
```

Para reactivar:
```bash
ssh -p 8080 deploy@2.24.123.93 'cd /var/www/clicktoeat/api && php artisan up'
```
