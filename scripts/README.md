# scripts/

Scripts operativos del proyecto. Ejecutables (`chmod +x`), diseñados para Hostinger Business Shared Hosting.

## Inventario

| Script              | Propósito                                          | Dónde corre     | Documentación                                    |
|--------------------|----------------------------------------------------|-----------------|--------------------------------------------------|
| `backup-mysql.sh`   | Dump diario de MySQL → comprime → off-site B2 + manifest sha256 | Servidor (cron de hPanel) | [`docs/runbook/backup-mysql-automatizado.md`](../docs/runbook/backup-mysql-automatizado.md) |
| `deploy-api.sh`     | rsync de `apps/api/` + composer install + migrate + caches + health check | Local (dev machine) | [`docs/infra/deploy-hostinger.md`](../docs/infra/deploy-hostinger.md) |
| `deploy-web.sh`     | Build Next.js standalone + tar + scp + restart Passenger + health check | Local (dev machine) | [`docs/infra/deploy-hostinger.md`](../docs/infra/deploy-hostinger.md) |

## Convenciones

- **Bash estricto**: `set -Eeuo pipefail`. Cualquier comando que falle aborta.
- **Sin secretos hardcodeados**. Cargan config desde `$HOME/.config/<script>.env` (servidor) o `~/.ssh/hostinger_clicktoeat` (local).
- **Logging a stdout/stderr** — el cron del hPanel redirige a `~/logs/<script>.log`.
- **Alertan en fallo** — webhook a Slack o ping `/fail` a Healthchecks.io.
- **Dead-man switch** opcional con `HEARTBEAT_URL`.
- **Sin dependencias exóticas** — sólo herramientas estándar de Linux + `rclone` para upload (instalable como binario en `~/bin/` sin root).

## Hostinger SSH

Todos los scripts de deploy usan estas credenciales (NO commitear la clave):

```
Host:    86.38.202.72
Port:    65002
User:    u221820910
Key:     ~/.ssh/hostinger_clicktoeat
```

Conexión directa:
```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
```

---

## Deploy de la API (deploy-api.sh)

### Uso típico

```bash
# Desde la raíz del repo
./scripts/deploy-api.sh                # full: tests + sync + composer + migrate + caches + health
./scripts/deploy-api.sh --skip-tests   # saltar phpunit local
./scripts/deploy-api.sh --skip-migrate # no correr migrate (sólo código)
./scripts/deploy-api.sh --dry-run      # mostrar qué se sincronizaría
```

### Lo que excluye del rsync (no se sube)

- `.env`, `.env.*` (el server tiene su propio `.env` productivo).
- `.git/`, `.gitignore`.
- `vendor/` (se reinstala con `composer install` en servidor).
- `node_modules/`.
- `storage/app/public/uploads/` (los uploads viven en el server, no se deben tocar).
- `storage/framework/{cache,sessions,views}/*`.
- `storage/logs/*.log`.
- `.phpunit.result.cache`.
- `tests/` (no se necesitan en prod).
- `composer.phar`.

### Rollback

Si algo falla y necesitas volver atrás:

```bash
git checkout <commit-anterior>
./scripts/deploy-api.sh --skip-tests --skip-migrate
```

Si hubo migración nueva que necesitas revertir, hazlo manual:

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
  "cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan migrate:rollback --step=1 --force"
```

---

## Deploy del Frontend (deploy-web.sh)

### Uso típico

```bash
./scripts/deploy-web.sh                # full: build + tarball + upload + extract + restart + health
./scripts/deploy-web.sh --skip-build   # asume que .next/standalone ya existe
./scripts/deploy-web.sh --dry-run      # build pero no sube
```

### Requisito previo en `apps/web/next.config.mjs`

Para que Passenger pueda servir Next.js eficientemente, el config debe incluir:

```js
const nextConfig = {
  output: 'standalone',
  // ... resto de tu config
};
```

Si no está, el script falla en pre-flight con mensaje claro.

### Rollback rápido

El script hace backup automático del build anterior. Si el deploy nuevo rompe algo:

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
  "cd /home/u221820910/nodejs \
   && rm -rf .next public \
   && mv .next.previous .next \
   && mv public.previous public \
   && touch tmp/restart.txt"
```

---

## Setup del backup en el servidor (primera vez)

```bash
# Conectar al servidor
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72

# 1) Instalar rclone como binario standalone (sin root)
mkdir -p ~/bin
cd ~/bin
curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip
unzip rclone-current-linux-amd64.zip
mv rclone-*/rclone .
chmod +x rclone
rm -rf rclone-* rclone-current-linux-amd64.zip

# Agregar al PATH
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verificar
rclone version

# 2) Configurar remote B2 en rclone
rclone config
# → New remote
# → Nombre: b2-clicktoeat
# → Type: b2 (Backblaze B2)
# → Account ID: <de la cuenta B2>
# → Application Key: <key con permisos solo writeFiles al bucket>

# 3) Crear directorios
mkdir -p ~/backups ~/logs ~/scripts ~/.config

# 4) Subir el script (desde local)
exit   # salir del SSH

# En local, desde la raíz del repo:
scp -i ~/.ssh/hostinger_clicktoeat -P 65002 \
  scripts/backup-mysql.sh \
  u221820910@86.38.202.72:~/scripts/

# Volver al servidor
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72

# 5) Permisos + config con credenciales
chmod 700 ~/scripts/backup-mysql.sh

cat > ~/.config/clicktoeat-backup.env <<'EOF'
DB_NAME=u221820910_clicktoeat
DB_USER=u221820910_clicktoeat
DB_PASSWORD=<copiar de ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env>
DB_HOST=localhost
DB_PORT=3306
B2_REMOTE=b2-clicktoeat
B2_BUCKET=clicktoeat-backups
B2_PREFIX=backups/clicktoeat
HEARTBEAT_URL=https://hc-ping.com/<uuid-clicktoeat-backup>
SLACK_WEBHOOK=https://hooks.slack.com/services/<webhook>
EOF
chmod 600 ~/.config/clicktoeat-backup.env

# 6) Probar manualmente
~/scripts/backup-mysql.sh

# Debe ver "✅ Backup completado" al final.
# Verificar que llegó a B2:
rclone ls b2-clicktoeat:clicktoeat-backups/backups/clicktoeat/$(date -u +%Y/%m)/

# 7) Agendar el cron en hPanel
# Hostinger → hPanel → Avanzado → Trabajos Cron → Crear nuevo
#
# Comando completo:
#   /home/u221820910/scripts/backup-mysql.sh >> /home/u221820910/logs/backup.log 2>&1
#
# Frecuencia: Personalizada → 0 3 * * *  (diariamente a las 03:00)

# 8) Verificar mañana que corrió
cat ~/logs/backup.log
ls -lh ~/backups/
```

### Configurar Healthchecks.io (dead-man switch)

1. Cuenta gratis en <https://healthchecks.io>.
2. Crear nuevo check:
   - Nombre: `clicktoeat-mysql-backup`
   - Schedule: cron `0 3 * * *`
   - Grace time: 2 hours
3. Copiar la URL del ping y ponerla en `HEARTBEAT_URL` del `.env`.

Si el cron no corre en 26h, Healthchecks te avisa por email/Slack.

---

## Setup de Slack webhook (opcional)

1. Slack → Apps → "Incoming Webhooks" → Add to Slack.
2. Elegir canal (ej. `#alertas-clicktoeat`).
3. Copiar la webhook URL.
4. Ponerla en `SLACK_WEBHOOK` del `.env` del backup.

---

## Próximos scripts a añadir

- `restore-mysql.sh` — automatizar el procedimiento del runbook `restaurar-backup-mysql.md`.
- `clean-orphan-uploads.sh` — encontrar archivos en `public_html/public/storage/uploads/` sin referencia en BD (productos eliminados).
- `health-check.sh` — smoke test completo post-deploy (login + endpoint público).
- `pre-deploy-check.sh` — corre el security-checklist programáticamente.
