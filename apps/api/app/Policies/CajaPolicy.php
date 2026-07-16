<?php

namespace App\Policies;

use App\Models\Caja;
use App\Models\User;

class CajaPolicy
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
        return $user->local_id !== null && ($user->isOwner() || $user->puedeAcceder('caja'));
    }

    public function view(User $user, Caja $caja): bool
    {
        return $user->local_id === $caja->local_id && ($user->isOwner() || $user->puedeAcceder('caja'));
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Caja $caja): bool
    {
        return $user->isOwner() && $user->local_id === $caja->local_id;
    }

    public function operar(User $user, Caja $caja): bool
    {
        return $user->local_id === $caja->local_id && ($user->isOwner() || $user->puedeAcceder('caja'));
    }
}
