<?php

namespace App\Console\Commands;

use App\Models\Local;
use Illuminate\Console\Command;

/**
 * Borra DEFINITIVAMENTE los locales soft-deleted con > N días (default 15).
 * Útil para mantener la BD acotada y dar al super un período de gracia para
 * arrepentirse de un borrado.
 *
 * Uso (cron semanal en hPanel):
 *   php artisan locales:purge          # default 15 días
 *   php artisan locales:purge --days=30
 */
class PurgeLocalesCommand extends Command
{
    protected $signature   = 'locales:purge {--days=15}';
    protected $description = 'Borra definitivamente locales soft-deleted con > N días (default 15)';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        if ($days < 1) {
            $this->error('Mínimo 1 día por seguridad.');
            return 1;
        }

        $cutoff = now()->subDays($days);
        $locales = Local::onlyTrashed()
            ->where('deleted_at', '<', $cutoff)
            ->get();

        if ($locales->isEmpty()) {
            $this->info('Nada que borrar definitivamente.');
            return 0;
        }

        foreach ($locales as $local) {
            $this->info("Borrando local #{$local->id} - {$local->nombre} (eliminado {$local->deleted_at})");
            $local->forceDelete();
        }

        $this->info(sprintf('Locales purgados definitivamente: %d', $locales->count()));
        return 0;
    }
}
