<?php

namespace App\Policies;

use App\Models\Producto;
use App\Models\User;

class ProductoPolicy
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

    public function view(User $user, Producto $producto): bool
    {
        return $user->local_id === $producto->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Producto $producto): bool
    {
        return $user->isOwner() && $user->local_id === $producto->local_id;
    }

    public function delete(User $user, Producto $producto): bool
    {
        return $user->isOwner() && $user->local_id === $producto->local_id;
    }

    public function uploadImage(User $user): bool
    {
        return $user->isOwner();
    }
}
