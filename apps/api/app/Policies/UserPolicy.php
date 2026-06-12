<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }
        return null;
    }

    /**
     * Listar usuarios del local — sólo owner.
     */
    public function viewAny(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    /**
     * Ver un usuario específico — owner del mismo local.
     * (Un staff podría verse a sí mismo via /auth/me, no necesita este endpoint.)
     */
    public function view(User $user, User $target): bool
    {
        return $user->isOwner() && $user->local_id === $target->local_id;
    }

    /**
     * Crear staff — sólo owner del local.
     * El owner sólo puede crear con rol=staff (enforced en FormRequest).
     */
    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    /**
     * Actualizar staff — sólo owner del mismo local.
     * Owner NO puede cambiarse a sí mismo via este endpoint (usar /auth/me y /local/branding).
     */
    public function update(User $user, User $target): bool
    {
        return $user->isOwner()
            && $user->local_id === $target->local_id
            && $user->id !== $target->id          // no editarse a sí mismo
            && $target->rol === 'staff';           // sólo staff (no otro owner)
    }

    /**
     * Eliminar staff — sólo owner del mismo local. Mismas restricciones que update.
     */
    public function delete(User $user, User $target): bool
    {
        return $user->isOwner()
            && $user->local_id === $target->local_id
            && $user->id !== $target->id
            && $target->rol === 'staff';
    }
}
