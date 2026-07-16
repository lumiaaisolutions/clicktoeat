<?php

namespace App\Policies;

use App\Models\CuentaMesa;
use App\Models\User;

class CuentaMesaPolicy
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
        return $user->local_id !== null && ($user->isOwner() || $user->puedeAcceder('caja') || $user->puedeAcceder('mesero'));
    }

    public function view(User $user, CuentaMesa $cuenta): bool
    {
        return $user->local_id === $cuenta->local_id;
    }

    public function manage(User $user, CuentaMesa $cuenta): bool
    {
        return $user->local_id === $cuenta->local_id && ($user->isOwner() || $user->puedeAcceder('caja') || $user->puedeAcceder('mesero'));
    }

    public function cerrar(User $user, CuentaMesa $cuenta): bool
    {
        return $user->local_id === $cuenta->local_id && ($user->isOwner() || $user->puedeAcceder('caja'));
    }
}
