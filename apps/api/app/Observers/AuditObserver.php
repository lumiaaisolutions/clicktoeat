<?php

namespace App\Observers;

use App\Services\Audit\AuditLogger;
use Illuminate\Database\Eloquent\Model;

/**
 * Observer reutilizable. Conectado a modelos sensibles desde AppServiceProvider.
 *
 * Captura created / updated / deleted / restored (modelos con SoftDeletes).
 *
 * Para `updated`: persiste diff `{ campo: [antes, después] }` excluyendo
 * timestamps y campos triviales.
 */
class AuditObserver
{
    /** Campos siempre excluidos del diff (ruido) */
    protected array $ignoredFields = [
        'updated_at', 'created_at', 'deleted_at', 'remember_token',
        'password',   // nunca loggear password (ni hashes)
    ];

    public function __construct(protected AuditLogger $logger) {}

    public function created(Model $model): void
    {
        $this->logger->log('created', $model);
    }

    public function updated(Model $model): void
    {
        $changes = [];

        foreach ($model->getChanges() as $field => $newValue) {
            if (in_array($field, $this->ignoredFields, true)) {
                continue;
            }
            $oldValue = $model->getOriginal($field);
            $changes[$field] = [$oldValue, $newValue];
        }

        // Si el único change era un campo ignorado, no loguear
        if (empty($changes)) {
            return;
        }

        $this->logger->log('updated', $model, $changes);
    }

    public function deleted(Model $model): void
    {
        $this->logger->log('deleted', $model);
    }

    public function restored(Model $model): void
    {
        $this->logger->log('restored', $model);
    }
}
