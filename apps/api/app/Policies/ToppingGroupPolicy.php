<?php

namespace App\Policies;

use App\Models\ToppingGroup;
use App\Models\User;

class ToppingGroupPolicy
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
        return $user->local_id !== null;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, ToppingGroup $group): bool
    {
        return $user->isOwner() && $user->local_id === $group->local_id;
    }

    public function delete(User $user, ToppingGroup $group): bool
    {
        return $user->isOwner() && $user->local_id === $group->local_id;
    }
}
