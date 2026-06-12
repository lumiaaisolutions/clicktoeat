<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/**
 * Canales privados de broadcasting.
 *
 * `local.{localId}` — sólo usuarios del local (owner/staff) y super_admin
 * pueden suscribirse. La auth se hace contra `/broadcasting/auth` con el
 * token Sanctum del usuario.
 *
 * Si BROADCAST_CONNECTION=log (default), estos canales no se usan.
 * Activar con BROADCAST_CONNECTION=pusher (ver runbook integrar-reverb.md).
 */

Broadcast::channel('local.{localId}', function (User $user, int $localId) {
    return $user->isSuperAdmin() || $user->local_id === (int) $localId;
});
