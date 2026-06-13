# Runbook — Recuperar uploads borrados por deploy

> Cuando deploy-api.sh corre con `rsync --delete`, puede borrar el directorio
> de uploads del servidor si los excludes no están bien configurados. Este
> runbook explica cómo recuperar y prevenir.

## Síntoma

- Productos, logos y banners aparecen como `[?]` (broken image) en la landing
  del local y en `/admin/branding`.
- Verificación: `curl https://clicktoeat-api.lumiaaisolutions.com/storage/uploads/productos/XXX.jpg`
  retorna **404**.

## Causa raíz

Hay **dos directorios** que guardan uploads en el servidor (legacy + actual):

| Path | Para qué |
|------|----------|
| `storage/app/public/uploads/` | Disk `public` de Laravel (donde guarda el `ImageUploader` actual) |
| `public/storage/uploads/` | Lo que LiteSpeed sirve vía URL `/storage/uploads/...` |

Idealmente `public/storage` es un **symlink** a `storage/app/public` (estándar
Laravel via `php artisan storage:link`). En este servidor en algún momento
NO era symlink sino dir copia — entonces los uploads existían duplicados.

El `rsync --delete` del deploy borraba `public/storage` si no estaba excluido.

## Recuperación de emergencia

### Si los archivos están en `storage/app/public/` pero `public/storage/` está vacío o incompleto:

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 \
  'cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
   cp -R -n storage/app/public/uploads/. public/storage/uploads/'
```

`cp -R -n` copia sin sobreescribir archivos que ya existan. No-destructivo.

### Si ambas ubicaciones se perdieron:

Restaurar desde el backup más reciente:

```bash
# Backups locales del servidor (3 días)
ls ~/backups/

# Backups off-site en B2 (cuando esté activado)
rclone copy b2:clicktoeat-backups/uploads/<fecha>/ \
  /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/public/storage/uploads/
```

Las uploads NO se incluyen en `backup-mysql.sh` (solo BD). Para backup de
uploads usar runbook independiente — TODO.

### Mejor opción a largo plazo: convertir `public/storage` en symlink

```bash
ssh ... '
cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
# Backup de cualquier archivo que esté solo en public/storage:
cp -R -n public/storage/uploads/. storage/app/public/uploads/
# Eliminar el dir físico
rm -rf public/storage
# Crear symlink correcto
ln -s ../storage/app/public public/storage
ls -la public/storage  # debe mostrar lrwxrwxrwx
'
```

Con symlink, ambas vistas (`public/storage` y `storage/app/public`) son el
mismo lugar — imposible que se desincronicen.

## Prevención

### En `deploy-api.sh` (ya aplicado, 2026-06-13)

Excludes ampliados para que `rsync --delete` NUNCA toque uploads:

```bash
RSYNC_OPTS=(
    -avz --delete
    # ... otros excludes
    --exclude='storage/app/public/'
    --exclude='public/storage'
    --exclude='public/storage/'
)
```

### Backup de uploads off-site (TODO)

Agregar al `scripts/backup-mysql.sh` un paso que también suba
`storage/app/public/uploads/` a B2 vía `rclone copy`. Cron diario.

Ver [`runbook/backup-mysql-automatizado.md`](./backup-mysql-automatizado.md)
para el patrón actual de backups.

## Post-mortem 2026-06-13

- **2026-06-12 23:50**: deploy-api.sh corrió con excludes incompletos
  (solo excluía `storage/app/public/uploads/` pero no `public/storage`).
- **rsync --delete** borró ~10 imágenes en `public/storage/uploads/` que no
  estaban en el repo.
- **Detectado**: ~5 min después por screenshot del usuario mostrando productos
  con `[?]`.
- **Recuperado**: `cp -R -n storage/app/public/uploads/. public/storage/uploads/`
  copió las imágenes faltantes desde el disk de Laravel. Cero data loss porque
  las imágenes vivían duplicadas.
- **Fix permanente**: excludes ampliados + este runbook documentado.

## Ver también

- [`infra/deploy-hostinger.md`](../infra/deploy-hostinger.md) — Setup productivo
- [`features/uploads.md`](../features/uploads.md) — Cómo se guardan las imágenes
- [`ADR-006-uploads-locales-interim.md`](../decisions/ADR-006-uploads-locales-interim.md) — Decisión
