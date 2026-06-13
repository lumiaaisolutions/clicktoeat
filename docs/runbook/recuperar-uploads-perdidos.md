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

**Opción A — Snapshot del VPS Hostinger (full-restore, DESTRUCTIVO)**

Disponible en hPanel → VPS → Snapshots & Backups. **Riesgos**:
- Reemplaza TODO el servidor, no solo las uploads.
- Pierdes cualquier código/BD posterior al snapshot.
- Snapshots son **semanales**; si la pérdida fue hace > 7 días, el más
  viejo ya rotó y no las tiene.

Solo úsalo si:
- El snapshot es reciente (≤ 24 h tras la pérdida).
- Estás dispuesto a re-aplicar cualquier cambio posterior manualmente.

**Opción B — Backup propio off-site (no implementado, TODO)**

Si `scripts/backup-mysql.sh` se extendiera para subir uploads a B2:

```bash
rclone copy b2:clicktoeat-backups/uploads/<fecha>/ \
  /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/storage/app/public/uploads/
```

Pendiente implementar — ver TODO al final del doc.

**Opción C — Re-subir manualmente desde admin**

Si las opciones A/B no aplican, el owner re-sube las imágenes desde
`/admin/productos`. Tedioso pero confiable. Las nuevas se guardarán en
`storage/app/public/uploads/` (disk `public`) y serán accesibles vía el
symlink `public/storage`.

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

### Timeline

- **2026-06-12 23:50**: deploy-api.sh corrió con excludes incompletos
  (solo excluía `storage/app/public/uploads/` pero no `public/storage`).
- **rsync --delete** borró ~10 imágenes en `public/storage/uploads/` que no
  estaban en el repo. En ese momento `public/storage` era directorio físico
  (NO symlink) — algunas imágenes vivían duplicadas en
  `storage/app/public/uploads/`, otras solo en `public/storage/`.
- **2026-06-13 00:00**: detectado por screenshot del usuario mostrando productos
  con `[?]`.
- **Recuperación parcial**: `cp -R -n storage/app/public/uploads/. public/storage/uploads/`
  restauró 8 archivos que estaban duplicados.
- **Pérdida real**: 7 imágenes que vivían SOLO en `public/storage/uploads/`
  se perdieron. Snapshot del VPS más reciente (semanal, ~7 días atrás) ya
  no las tenía porque eran subidas posteriores a esa fecha.
- **Decisión del owner**: NO usar full-restore del snapshot (perdería 8 días
  de código nuevo); re-subir las 7 imágenes manualmente desde admin.

### Fixes permanentes aplicados

1. **`scripts/deploy-api.sh`** excludes ampliados:
   ```
   --exclude='storage/app/public/'
   --exclude='public/storage'
   --exclude='public/storage/'
   ```
2. **`public/storage` convertido a symlink** correcto a `../storage/app/public`.
   Ahora ambos paths son la misma carpeta física — imposible que se desincronicen.
3. **Este runbook** + actualización de `CLAUDE.md` y `docs/infra/deploy-hostinger.md`
   reflejando que el hosting es **VPS+CageFS** (no Shared como decía la doc vieja).

### Lessons learned

- Los snapshots del VPS Hostinger son **semanales** y **full-restore destructivo**.
  No bastan como backup primario.
- El backup off-site propio (script + B2) **debe incluir uploads**, no solo BD.
  TODO crítico para resolver antes de los siguientes 50 clientes.
- `cp -R -n` (no `cp -R` solo) — el `-n` no sobreescribe archivos existentes,
  perfecto para recuperaciones no-destructivas.
- **Siempre** rename antes de `rm -rf`: usé `mv public/storage public/storage.backup-20260613`
  antes de crear el symlink. Si algo fallaba, rollback era 1 comando.

## Ver también

- [`infra/deploy-hostinger.md`](../infra/deploy-hostinger.md) — Setup productivo
- [`features/uploads.md`](../features/uploads.md) — Cómo se guardan las imágenes
- [`ADR-006-uploads-locales-interim.md`](../decisions/ADR-006-uploads-locales-interim.md) — Decisión
