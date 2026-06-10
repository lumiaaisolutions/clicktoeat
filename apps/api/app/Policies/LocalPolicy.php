<?php

namespace App\Policies;

use App\Models\Local;
use App\Models\User;

class LocalPolicy
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
        return $user->isOwner() || $user->rol === 'staff';
    }

    public function view(User $user, Local $local): bool
    {
        return $user->local_id === $local->id;
    }

    public function update(User $user, Local $local): bool
    {
        return $user->isOwner() && $user->local_id === $local->id;
    }

    public function delete(User $user, Local $local): bool
    {
        return false; // sólo super_admin (via before())
    }

    public function suspend(User $user, Local $local): bool
    {
        return false; // sólo super_admin (via before())
    }
}
