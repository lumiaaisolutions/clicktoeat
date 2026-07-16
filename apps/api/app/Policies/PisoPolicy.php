<?php

namespace App\Policies;

use App\Models\Piso;
use App\Models\User;

class PisoPolicy
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
        return $user->local_id !== null && $user->puedeAcceder('mesas');
    }

    public function view(User $user, Piso $piso): bool
    {
        return $user->local_id === $piso->local_id && $user->puedeAcceder('mesas');
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Piso $piso): bool
    {
        return $user->isOwner() && $user->local_id === $piso->local_id;
    }

    public function delete(User $user, Piso $piso): bool
    {
        return $user->isOwner() && $user->local_id === $piso->local_id;
    }
}
