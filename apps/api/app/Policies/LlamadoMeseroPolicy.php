<?php

namespace App\Policies;

use App\Models\LlamadoMesero;
use App\Models\User;

class LlamadoMeseroPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->local_id !== null
            && ($user->isOwner() || $user->puedeAcceder('mesero'));
    }

    public function atender(User $user, LlamadoMesero $llamado): bool
    {
        return $user->local_id === $llamado->local_id
            && ($user->isOwner() || $user->puedeAcceder('mesero'));
    }
}
