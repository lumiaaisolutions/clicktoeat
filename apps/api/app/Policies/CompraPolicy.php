<?php

namespace App\Policies;

use App\Models\Compra;
use App\Models\User;

class CompraPolicy
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

    public function view(User $user, Compra $compra): bool
    {
        return $user->local_id === $compra->local_id;
    }

    public function create(User $user): bool
    {
        return ($user->isOwner() || $user->rol === 'staff') && $user->local_id !== null;
    }

    public function delete(User $user, Compra $compra): bool
    {
        return $user->isOwner() && $user->local_id === $compra->local_id;
    }
}
