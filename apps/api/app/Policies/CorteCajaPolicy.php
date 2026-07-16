<?php

namespace App\Policies;

use App\Models\CorteCaja;
use App\Models\User;

class CorteCajaPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    public function view(User $user, CorteCaja $corte): bool
    {
        return $user->local_id === $corte->local_id && ($user->isOwner() || $user->puedeAcceder('caja'));
    }

    public function operar(User $user, CorteCaja $corte): bool
    {
        return $user->local_id === $corte->local_id && ($user->isOwner() || $user->puedeAcceder('caja'));
    }
}
