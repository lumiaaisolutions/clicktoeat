<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

/**
 * Backup local diario de la BD de producción (F102 — gap operativo, no
 * exclusivo de ningún plan, ver ADR-012 decisión #7).
 *
 * v1 = solo local (dump + gzip + retención en el propio VPS). NO sube a
 * almacenamiento offsite todavía — eso requiere credenciales reales de un
 * proveedor (Backblaze B2 vía `scripts/backup-mysql.sh`, ya escrito en el
 * repo pero pendiente de credenciales) y quedó fuera de este comando a
 * propósito para no bloquear la protección local por falta de secretos.
 *
 * Restricción real de Hostinger (ver CLAUDE.md): el usuario MySQL NO tiene
 * SUPER/RELOAD → `mysqldump` usa `--no-tablespaces` y sin rutinas/triggers.
 *
 * Uso:
 *   php artisan backup:run                  # retención default 14 días
 *   php artisan backup:run --keep-days=7
 */
class BackupDatabaseCommand extends Command
{
    protected $signature = 'backup:run {--keep-days=14}';

    protected $description = 'Genera un dump local comprimido de la BD y purga backups viejos (sin offsite todavía)';

    public function handle(): int
    {
        if (config('database.default') !== 'mysql') {
            $this->warn('Conexión default no es mysql — no se genera backup (esperado en dev/test).');

            return 0;
        }

        $conn = config('database.connections.mysql');
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);

        $filename = 'backup-'.now()->format('Y-m-d_His').'.sql.gz';
        $path = $dir.'/'.$filename;

        $dump = new Process([
            'mysqldump',
            '--no-tablespaces',
            '--skip-routines',
            '--skip-triggers',
            '--single-transaction',
            '-h', $conn['host'],
            '-P', (string) ($conn['port'] ?? 3306),
            '-u', $conn['username'],
            $conn['database'],
        ]);
        $dump->setEnv(['MYSQL_PWD' => $conn['password']]); // no va en argv — no aparece en `ps aux`
        $dump->setTimeout(600);
        $dump->run();

        if (! $dump->isSuccessful()) {
            $this->error('mysqldump falló: '.$dump->getErrorOutput());

            return 1;
        }

        $gzip = new Process(['gzip', '-c']);
        $gzip->setInput($dump->getOutput());
        $gzip->setTimeout(600);
        $gzip->run();

        if (! $gzip->isSuccessful()) {
            $this->error('gzip falló: '.$gzip->getErrorOutput());

            return 1;
        }

        File::put($path, $gzip->getOutput());
        $size = filesize($path);

        if ($size < 1024) {
            $this->error("Dump sospechosamente pequeño ({$size} bytes) — no se purgan backups viejos por seguridad.");

            return 1;
        }

        $this->info("Backup creado: {$filename} (".round($size / 1024, 1).' KB)');
        $this->purgarViejos($dir, (int) $this->option('keep-days'));

        return 0;
    }

    private function purgarViejos(string $dir, int $keepDays): void
    {
        $cutoff = now()->subDays($keepDays)->timestamp;
        $borrados = 0;

        foreach (File::files($dir) as $file) {
            if (str_ends_with($file->getFilename(), '.sql.gz') && $file->getMTime() < $cutoff) {
                File::delete($file->getPathname());
                $borrados++;
            }
        }

        if ($borrados > 0) {
            $this->info("Purgados {$borrados} backups anteriores a {$keepDays} días.");
        }
    }
}
