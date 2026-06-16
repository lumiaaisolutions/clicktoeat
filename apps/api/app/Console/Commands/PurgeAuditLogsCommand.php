<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;

/**
 * Borra audit_logs > N días (default 365). Útil para mantener la tabla
 * acotada. Correr semanalmente desde hPanel Cron.
 *
 * Uso:
 *   php artisan audit-logs:purge          # default 365
 *   php artisan audit-logs:purge --days=90
 */
class PurgeAuditLogsCommand extends Command
{
    protected $signature   = 'audit-logs:purge {--days=365}';
    protected $description = 'Borra audit_logs anteriores a N días (default 365)';

    public function handle(): int
    {
        $days  = (int) $this->option('days');
        if ($days < 30) {
            $this->error('Mínimo 30 días por seguridad.');
            return 1;
        }
        $cutoff = now()->subDays($days);
        $count  = AuditLog::query()->where('created_at', '<', $cutoff)->count();
        if ($count === 0) {
            $this->info('Nada que borrar.');
            return 0;
        }
        AuditLog::query()->where('created_at', '<', $cutoff)->delete();
        $this->info("Borrados {$count} registros anteriores a {$cutoff->format('Y-m-d')}.");
        return 0;
    }
}
