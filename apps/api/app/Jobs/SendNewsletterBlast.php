<?php

namespace App\Jobs;

use App\Models\NewsletterBlast;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Envía el newsletter en chunks. Si QUEUE_CONNECTION=sync (default actual)
 * corre inmediatamente en el request. Cuando se active queue:database y
 * el cron `queue:work --stop-when-empty`, se procesará en background.
 */
class SendNewsletterBlast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;

    public function __construct(public int $blastId, public string $rol) {}

    public function handle(): void
    {
        $blast = NewsletterBlast::find($this->blastId);
        if (! $blast) return;

        $query = User::query()->whereNotNull('email');
        if ($this->rol !== 'todos') $query->where('rol', $this->rol);

        $sent = 0; $failed = 0;
        $query->select('id', 'nombre', 'email')->chunkById(100, function ($users) use ($blast, &$sent, &$failed) {
            foreach ($users as $u) {
                try {
                    Mail::raw($blast->body, function ($m) use ($u, $blast) {
                        $m->to($u->email)->subject($blast->asunto);
                    });
                    $sent++;
                } catch (\Throwable $e) {
                    Log::warning('newsletter send failed', ['user' => $u->id, 'error' => $e->getMessage()]);
                    $failed++;
                }
            }
            // Actualiza contadores parciales por chunk
            $blast->update(['sent_count' => $sent, 'failed_count' => $failed]);
        });

        $blast->update([
            'sent_count'   => $sent,
            'failed_count' => $failed,
            'finished_at'  => now(),
        ]);
    }
}
