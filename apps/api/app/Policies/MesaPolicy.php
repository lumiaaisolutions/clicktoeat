<?php

namespace App\Policies;

use App\Models\Mesa;
use App\Models\User;

class MesaPolicy
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
            && ($user->puedeAcceder('mesas') || $user->puedeAcceder('cocina') || $user->puedeAcceder('mesero'));
    }

    public function view(User $user, Mesa $mesa): bool
    {
        return $user->local_id === $mesa->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Mesa $mesa): bool
    {
        return $user->isOwner() && $user->local_id === $mesa->local_id;
    }

    public function delete(User $user, Mesa $mesa): bool
    {
        return $user->isOwner() && $user->local_id === $mesa->local_id;
    }
}
