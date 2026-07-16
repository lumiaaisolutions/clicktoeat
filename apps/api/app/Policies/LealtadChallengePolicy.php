<?php

namespace App\Policies;

use App\Models\LealtadChallenge;
use App\Models\User;

class LealtadChallengePolicy
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

    public function update(User $user, LealtadChallenge $c): bool
    {
        return $user->isOwner() && $user->local_id === $c->local_id;
    }

    public function delete(User $user, LealtadChallenge $c): bool
    {
        return $user->isOwner() && $user->local_id === $c->local_id;
    }
}
