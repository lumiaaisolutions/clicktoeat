<?php

namespace App\Policies;

use App\Models\Producto;
use App\Models\Receta;
use App\Models\User;

class RecetaPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user, Producto $producto): bool
    {
        return $user->local_id === $producto->local_id;
    }

    public function manage(User $user, Producto $producto): bool
    {
        return $user->isOwner() && $user->local_id === $producto->local_id;
    }

    public function delete(User $user, Receta $receta): bool
    {
        $localOk = $user->local_id === $receta->producto?->local_id;
        return $user->isOwner() && $localOk;
    }
}
