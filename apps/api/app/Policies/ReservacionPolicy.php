<?php

namespace App\Policies;

use App\Models\Reservacion;
use App\Models\User;

class ReservacionPolicy
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

    public function view(User $user, Reservacion $r): bool
    {
        return $user->local_id === $r->local_id;
    }

    public function create(User $user): bool
    {
        return $user->local_id !== null && ($user->isOwner() || $user->puedeAcceder('mesero'));
    }

    public function update(User $user, Reservacion $r): bool
    {
        return $user->local_id === $r->local_id && ($user->isOwner() || $user->puedeAcceder('mesero'));
    }

    public function delete(User $user, Reservacion $r): bool
    {
        return $user->isOwner() && $user->local_id === $r->local_id;
    }
}
