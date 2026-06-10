<?php

namespace App\Policies;

use App\Models\Categoria;
use App\Models\User;

class CategoriaPolicy
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

    public function view(User $user, Categoria $categoria): bool
    {
        return $user->local_id === $categoria->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Categoria $categoria): bool
    {
        return $user->isOwner() && $user->local_id === $categoria->local_id;
    }

    public function delete(User $user, Categoria $categoria): bool
    {
        return $user->isOwner() && $user->local_id === $categoria->local_id;
    }
}
