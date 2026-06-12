<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Servicio para escribir filas de audit_logs.
 *
 * Llamado desde:
 *  - AuditObserver (auto-captura de eventos Eloquent).
 *  - Endpoints custom que quieran loguear eventos no-Eloquent (login, logout, etc.) — pendiente.
 */
class AuditLogger
{
    /**
     * Registra un evento de auditoría.
     *
     * @param array<string, array{0: mixed, 1: mixed}>|null $changes
     */
    public function log(
        string $action,
        Model $resource,
        ?array $changes = null,
    ): AuditLog {
        $request = request();
        $user    = Auth::user();

        // Si el recurso es un modelo con local_id, usarlo. Sino, intentar el del user.
        $localId = $resource->local_id ?? $user?->local_id;

        return AuditLog::create([
            'local_id'      => $localId,
            'actor_user_id' => $user?->id,
            'action'        => $action,
            'resource_type' => get_class($resource),
            'resource_id'   => $resource->getKey(),
            'changes'       => $changes,
            'ip'            => $request?->ip(),
            'user_agent'    => mb_substr((string) $request?->userAgent(), 0, 255),
            'created_at'    => now(),
        ]);
    }
}
