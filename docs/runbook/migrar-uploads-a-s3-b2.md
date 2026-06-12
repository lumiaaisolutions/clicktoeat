# Runbook — Migrar uploads de filesystem local a S3 / Backblaze B2

> Hoy las imágenes viven en `public_html/public/storage/uploads/` del servidor Hostinger. Esto **no escala** horizontalmente y no tiene CDN. Cuando crezca el catálogo o se quiera CDN, migrar a un object storage.

## Cuándo hacer esta migración

Indicadores que justifican la migración:

- 🔴 **Uploads > 1 GB total** — empieza a impactar el quota del plan Hostinger Business.
- 🔴 **Latencia de imágenes > 500 ms** desde clientes distantes (Phoenix, AZ → México DF tiene ~80ms baseline; si una imagen JPG de 800kb tarda > 1s en cargar, hay problema).
- 🔴 **Necesitás resize / variantes** (thumbnail, mobile, retina) — local no lo hace, S3/Cloudflare Images sí.
- 🟡 **Multi-instancia eventual** del backend — sin object storage compartido, cada réplica vería sus propias uploads.

Si nada de esto aplica, **no migres**. Local funciona bien hasta ~10k productos con imágenes.

## Opciones evaluadas

| Provider | Precio storage | Egress | API S3-compatible | Veredicto |
|---------|---------------|--------|---------------------|-----------|
| **Backblaze B2** | $0.005/GB/mes | $0.01/GB (1 GB/día gratis) | ✅ Sí | 🥇 Recomendado |
| **Cloudflare R2** | $0.015/GB/mes | **$0** egress | ✅ Sí | 🥈 Si ya usás Cloudflare |
| **AWS S3 Standard-IA** | $0.0125/GB/mes | $0.09/GB | ✅ Nativo | Sólo si ya estás en AWS |
| **Cloudinary** | Tier gratis hasta 25 GB | Incluye CDN | ❌ API propia | Si quieres resize automático |
| **Hostinger Cloud Storage** | (a verificar plan) | (a verificar) | ? | Verificar primero |

**Recomendación: Cloudflare R2** si ya hay Cloudflare en frente del frontend (egress gratis = bandwidth ilimitado). Si no, **Backblaze B2** + Cloudflare como CDN delante.

## Estrategia de migración

**Sin downtime**, con doble escritura temporal:

```
Fase 1 (deploy): Doble write
  - Nuevas uploads → ambos: filesystem local + S3
  - Lecturas → siguen apuntando a filesystem local (URLs viejas funcionan)

Fase 2 (offline job): Backfill
  - Script copia TODAS las uploads existentes de filesystem → S3
  - Genera mapeo old_url → new_url

Fase 3 (deploy): Switch lecturas
  - Update masivo de productos/locales: `imagen_url` apunta a S3
  - Nuevas uploads → SÓLO S3 (no más doble write)

Fase 4 (cleanup, +30 días):
  - Borrar `public/storage/uploads/` del servidor
```

## Implementación

### 1. Crear el bucket

#### Cloudflare R2
```
Cloudflare dashboard → R2 → Create bucket
  - Name: clicktoeat-uploads
  - Location: Automatic
```
Generar credenciales: R2 → Manage R2 API tokens → Create API token (con permisos Object Read & Write al bucket).

#### Backblaze B2
```
B2 dashboard → Buckets → Create a Bucket
  - Name: clicktoeat-uploads
  - Files in Bucket: Public  (para que el CDN/cliente lean)
```
Generar Application Key con permisos `readFiles + writeFiles + deleteFiles` al bucket.

### 2. Configurar Laravel filesystem

`apps/api/config/filesystems.php` → agregar disk:

```php
's3' => [
    'driver' => 's3',
    'key' => env('S3_ACCESS_KEY'),
    'secret' => env('S3_SECRET_KEY'),
    'region' => env('S3_REGION', 'auto'),                    // R2 = 'auto', B2 = 'us-west-002' etc.
    'bucket' => env('S3_BUCKET'),
    'endpoint' => env('S3_ENDPOINT'),                          // R2: https://<account>.r2.cloudflarestorage.com
    'use_path_style_endpoint' => env('S3_PATH_STYLE', true),
    'url' => env('S3_PUBLIC_URL'),                              // CDN / custom domain
    'visibility' => 'public',
    'throw' => false,
],
```

`composer require league/flysystem-aws-s3-v3 "^3.0"` para que `driver=s3` funcione.

### 3. `.env` productivo

```env
# Switchear el default
FILESYSTEM_DISK=s3

# Credenciales R2 (ejemplo)
S3_ACCESS_KEY=<de Cloudflare R2>
S3_SECRET_KEY=<de Cloudflare R2>
S3_REGION=auto
S3_BUCKET=clicktoeat-uploads
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_PATH_STYLE=false                       # R2 usa virtual-hosted
S3_PUBLIC_URL=https://uploads.clicktoeat.lumiaaisolutions.com   # custom domain del bucket
```

(B2 usa endpoint `https://s3.<region>.backblazeb2.com` y `S3_PATH_STYLE=true`).

### 4. Custom domain para el bucket (recomendado)

En lugar de URLs feas tipo `https://<account>.r2.cloudflarestorage.com/...`, configurar un subdominio:

- Cloudflare: en el bucket → **Settings** → **Custom Domains** → add `uploads.clicktoeat.lumiaaisolutions.com`.
- DNS: Cloudflare lo configura automático si tu dominio ya está en Cloudflare.
- B2: requiere otra cosa — más fácil ponerle Cloudflare delante.

### 5. Adaptar `ImageUploader`

`apps/api/app/Services/Images/ImageUploader.php` ya usa `Storage::disk('public')`. Cambiar a:

```php
// Antes
$file->storeAs("uploads/{$folder}", $name, 'public');
// La URL la armaba con `config('app.url').'/storage/'.$relative`

// Después
$file->storeAs("uploads/{$folder}", $name, config('filesystems.default'));
// La URL: Storage::disk()->url($relative);
```

El método `destroy()` ya usa `Storage::disk('public')->delete(...)` — cambiarlo a `Storage::disk()->delete(...)`.

### 6. Script de backfill

`scripts/migrar-uploads-a-s3.php` (artisan command):

```bash
php artisan make:command MigrarUploadsAS3
```

```php
<?php

namespace App\Console\Commands;

use App\Models\Producto;
use App\Models\Local;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrarUploadsAS3 extends Command
{
    protected $signature = 'uploads:migrar-a-s3 {--dry-run}';
    protected $description = 'Copia todas las uploads del disk public local a S3 + actualiza URLs en BD';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $localDisk = Storage::disk('public');
        $s3Disk    = Storage::disk('s3');

        $files = $localDisk->allFiles('uploads');
        $this->info(sprintf('Encontrados %d archivos para migrar', count($files)));

        $migrados = 0;
        $errores  = 0;

        foreach ($files as $path) {
            try {
                if (! $dryRun) {
                    $stream = $localDisk->readStream($path);
                    $s3Disk->writeStream($path, $stream);
                    fclose($stream);
                }
                $this->info(($dryRun ? '[DRY] ' : '').$path);
                $migrados++;
            } catch (\Throwable $e) {
                $this->error("FAIL {$path}: {$e->getMessage()}");
                $errores++;
            }
        }

        $this->info("Migrados: {$migrados} | Errores: {$errores}");

        // Update masivo de URLs en BD
        $oldBase = rtrim(config('app.url'), '/').'/storage/';
        $newBase = rtrim(config('filesystems.disks.s3.url'), '/').'/';

        if (! $dryRun) {
            Producto::whereNotNull('imagen_url')
                ->where('imagen_url', 'like', "{$oldBase}%")
                ->chunk(100, function ($productos) use ($oldBase, $newBase) {
                    foreach ($productos as $p) {
                        $p->imagen_url = str_replace($oldBase, $newBase, $p->imagen_url);
                        $p->saveQuietly();    // sin disparar Observers (no inundar audit_logs)
                    }
                });

            Local::whereNotNull('logo_url')
                ->where('logo_url', 'like', "{$oldBase}%")
                ->chunk(100, function ($locales) use ($oldBase, $newBase) {
                    foreach ($locales as $l) {
                        $l->logo_url   = str_replace($oldBase, $newBase, $l->logo_url ?? '');
                        $l->banner_url = str_replace($oldBase, $newBase, $l->banner_url ?? '');
                        $l->saveQuietly();
                    }
                });
        }

        return self::SUCCESS;
    }
}
```

Ejecutar:

```bash
# Dry-run primero
php artisan uploads:migrar-a-s3 --dry-run

# Real
php artisan uploads:migrar-a-s3
```

### 7. Test pre-deploy

En staging o un local de prueba:

```bash
curl -X POST https://clicktoeat-api.lumiaaisolutions.com/api/v1/uploads/image \
  -H "Authorization: Bearer <token>" \
  -F "image=@test.png" -F "folder=productos"
```

Response debe traer `url` apuntando al custom domain del bucket (`https://uploads.clicktoeat...`).

Abrir esa URL en el browser → debe descargar la imagen.

### 8. Cleanup post-migración (+30 días)

Después de verificar que TODO funciona en prod:

```bash
ssh ... 'rm -rf /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/public/storage/uploads/'
```

Liberar el quota del plan Hostinger.

### 9. CORS del bucket (si el frontend hace fetch directo)

R2 / B2 dashboards → bucket → CORS rules:

```json
[
  {
    "AllowedOrigins": ["https://clicktoeat.lumiaaisolutions.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

Sólo necesario si el frontend lee con fetch (no si usa `<img src>` plano).

## Updates a documentación

Cuando se complete la migración:

- [ ] Marcar **ADR-006** como `superseded by ADR-XXX` y crear nuevo ADR explicando el cambio a object storage.
- [ ] Actualizar `docs/features/uploads.md` con el nuevo flujo.
- [ ] Actualizar `docs/infra/deploy-hostinger.md` — sección storage.
- [ ] Actualizar `docs/security/threat-model.md` — vector #7 ("File upload abuse") se mitiga (object storage no ejecuta PHP).
- [ ] Quitar el pendiente de `docs/issues/devops-faltante.md`.

## Rollback

Si algo sale mal en la migración:

1. Revertir el `.env` productivo a `FILESYSTEM_DISK=local`.
2. `php artisan config:clear && php artisan config:cache`.
3. Las URLs viejas en BD siguen apuntando al filesystem local — sólo nuevas uploads se vuelven a guardar localmente.
4. Investigar el problema, fix, rehacer la migración con el script.

## Costo estimado

Para ClickToEat al volumen actual (~3 MB total uploads):

| Provider | Storage | Egress mensual (estimado 10 GB) | Total |
|---------|---------|----------------------------------|-------|
| R2      | $0.05/mes | $0 | **$0.05/mes** |
| B2      | $0.02/mes | $0 (bajo 1 GB/día gratis) | **$0.02/mes** |
| S3 IA   | $0.04/mes | $0.90 | $0.94/mes |

Trivial. Pero el valor está en el upside (CDN gratis con R2, futuro multi-instancia, resize, etc.), no en el costo.
