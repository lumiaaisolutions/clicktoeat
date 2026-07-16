<?php

namespace App\Policies;

use App\Models\StaffShift;
use App\Models\User;

class StaffShiftPolicy
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

    public function update(User $user, StaffShift $s): bool
    {
        return $user->isOwner() && $user->local_id === $s->local_id;
    }

    public function delete(User $user, StaffShift $s): bool
    {
        return $user->isOwner() && $user->local_id === $s->local_id;
    }
}
