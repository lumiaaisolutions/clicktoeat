<?php

namespace App\Policies;

use App\Models\Campana;
use App\Models\User;

class CampanaPolicy
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
        return $user->isOwner() && $user->local_id !== null;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Campana $c): bool
    {
        return $user->isOwner() && $user->local_id === $c->local_id;
    }

    public function delete(User $user, Campana $c): bool
    {
        return $user->isOwner() && $user->local_id === $c->local_id;
    }
}
