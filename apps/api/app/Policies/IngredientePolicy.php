<?php

namespace App\Policies;

use App\Models\Ingrediente;
use App\Models\User;

class IngredientePolicy
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

    public function view(User $user, Ingrediente $ingrediente): bool
    {
        return $user->local_id === $ingrediente->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Ingrediente $ingrediente): bool
    {
        return ($user->isOwner() || $user->rol === 'staff')
            && $user->local_id === $ingrediente->local_id;
    }

    public function delete(User $user, Ingrediente $ingrediente): bool
    {
        return $user->isOwner() && $user->local_id === $ingrediente->local_id;
    }
}
