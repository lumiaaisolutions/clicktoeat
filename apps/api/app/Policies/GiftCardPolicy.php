<?php

namespace App\Policies;

use App\Models\GiftCard;
use App\Models\User;

class GiftCardPolicy
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

    public function view(User $user, GiftCard $g): bool
    {
        return $user->local_id === $g->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }
}
