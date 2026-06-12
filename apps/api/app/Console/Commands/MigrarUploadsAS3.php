<?php

namespace App\Console\Commands;

use App\Models\Local;
use App\Models\Producto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Comando one-shot para migrar uploads del disk local al disk s3.
 *
 * Uso:
 *   php artisan uploads:migrar-a-s3 --dry-run     # mostrar qué se copiaría
 *   php artisan uploads:migrar-a-s3                # copiar + actualizar URLs en BD
 *
 * Pre-requisito: configurar el disk s3 en .env (S3_*) ANTES.
 *
 * Ver runbook completo: docs/runbook/migrar-uploads-a-s3-b2.md
 */
class MigrarUploadsAS3 extends Command
{
    protected $signature = 'uploads:migrar-a-s3 {--dry-run : No copia ni actualiza, solo muestra qué haría}';

    protected $description = 'Copia todas las uploads del disk public local al disk s3 + actualiza URLs en BD';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if (! config('filesystems.disks.s3.bucket')) {
            $this->error('El disk "s3" no está configurado en .env (S3_BUCKET vacío).');
            $this->line('Ver docs/runbook/migrar-uploads-a-s3-b2.md');
            return self::FAILURE;
        }

        $localDisk = Storage::disk('public');
        $s3Disk    = Storage::disk('s3');

        if (! $localDisk->exists('uploads')) {
            $this->info('No hay uploads que migrar — el directorio "uploads" no existe en el disk local.');
            return self::SUCCESS;
        }

        $files = $localDisk->allFiles('uploads');
        $this->info(sprintf('Encontrados %d archivos para migrar', count($files)));

        if (empty($files)) {
            return self::SUCCESS;
        }

        $migrados = 0;
        $skipped  = 0;
        $errores  = 0;

        $bar = $this->output->createProgressBar(count($files));
        $bar->start();

        foreach ($files as $path) {
            try {
                // Skip si ya existe en S3 (resumable)
                if ($s3Disk->exists($path)) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }

                if (! $dryRun) {
                    $stream = $localDisk->readStream($path);
                    if ($stream === null) {
                        $errores++;
                        $this->newLine();
                        $this->error("No se pudo leer: {$path}");
                        $bar->advance();
                        continue;
                    }
                    $s3Disk->writeStream($path, $stream);
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }
                $migrados++;
            } catch (\Throwable $e) {
                $errores++;
                $this->newLine();
                $this->error("FAIL {$path}: {$e->getMessage()}");
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Migrados: {$migrados} · Skipped (ya existían): {$skipped} · Errores: {$errores}");

        if ($dryRun) {
            $this->warn('DRY-RUN — no se actualizó BD. Repite sin --dry-run para aplicar.');
            return self::SUCCESS;
        }

        // ─── Update masivo de URLs en BD ─────────────────────────
        $oldBase = rtrim(config('filesystems.disks.public.url'), '/').'/';
        $newBase = rtrim(config('filesystems.disks.s3.url') ?? '', '/').'/';

        if ($oldBase === '/' || $newBase === '/') {
            $this->error('No pude calcular las base URLs (public.url o s3.url vacíos). URLs en BD NO actualizadas.');
            return self::FAILURE;
        }

        $this->info("Actualizando URLs: {$oldBase} → {$newBase}");

        $productosActualizados = 0;
        Producto::withTrashed()
            ->whereNotNull('imagen_url')
            ->where('imagen_url', 'like', "{$oldBase}%")
            ->chunk(100, function ($productos) use ($oldBase, $newBase, &$productosActualizados) {
                foreach ($productos as $p) {
                    $p->imagen_url = str_replace($oldBase, $newBase, (string) $p->imagen_url);
                    $p->saveQuietly();
                    $productosActualizados++;
                }
            });

        $localesActualizados = 0;
        Local::withTrashed()
            ->where(function ($q) use ($oldBase) {
                $q->where('logo_url',   'like', "{$oldBase}%")
                  ->orWhere('banner_url', 'like', "{$oldBase}%");
            })
            ->chunk(100, function ($locales) use ($oldBase, $newBase, &$localesActualizados) {
                foreach ($locales as $l) {
                    $l->logo_url   = $l->logo_url   ? str_replace($oldBase, $newBase, $l->logo_url)   : null;
                    $l->banner_url = $l->banner_url ? str_replace($oldBase, $newBase, $l->banner_url) : null;
                    $l->saveQuietly();
                    $localesActualizados++;
                }
            });

        $this->info("Productos actualizados: {$productosActualizados}");
        $this->info("Locales actualizados:   {$localesActualizados}");

        $this->newLine();
        $this->info('✅ Migración completa. Verifica en el panel que las imágenes cargan del nuevo storage.');
        $this->warn('Después de validar (≥ 1 semana): rm -rf public/storage/uploads/ del servidor.');

        return self::SUCCESS;
    }
}
