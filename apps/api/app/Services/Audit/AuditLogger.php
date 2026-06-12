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

        // Strict mode (preventAccessingMissingAttributes) lanza si tocamos
        // `local_id` y la columna no existe (caso: Local model). Usar
        // getAttributes() retorna el array bruto sin pasar por strict.
        $resourceAttrs = $resource->getAttributes();
        $userAttrs     = $user?->getAttributes() ?? [];

        $localId = match (true) {
            $resource instanceof \App\Models\Local            => $resource->getKey(),
            array_key_exists('local_id', $resourceAttrs)      => $resourceAttrs['local_id'],
            default                                            => $userAttrs['local_id'] ?? null,
        };

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
