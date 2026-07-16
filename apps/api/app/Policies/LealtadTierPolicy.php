<?php

namespace App\Policies;

use App\Models\LealtadTier;
use App\Models\User;

class LealtadTierPolicy
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

    public function update(User $user, LealtadTier $t): bool
    {
        return $user->isOwner() && $user->local_id === $t->local_id;
    }

    public function delete(User $user, LealtadTier $t): bool
    {
        return $user->isOwner() && $user->local_id === $t->local_id;
    }
}
