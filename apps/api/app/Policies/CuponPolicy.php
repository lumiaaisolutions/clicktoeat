<?php

namespace App\Policies;

use App\Models\Cupon;
use App\Models\User;

/**
 * SEV-12 del audit 2026-06-19 — autorización explícita por endpoint.
 *
 * Antes el `CuponController` confiaba 100% en TenantScope global para
 * filtrar. Si el scope se desactiva (super_admin sin set context, un
 * `withoutGlobalScopes` mal puesto, jobs en consola), cualquier cupon
 * era accesible cross-tenant. Esta policy es la segunda red.
 */
class CuponPolicy
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

    public function view(User $user, Cupon $cupon): bool
    {
        return $user->local_id === $cupon->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Cupon $cupon): bool
    {
        return $user->isOwner() && $user->local_id === $cupon->local_id;
    }

    public function delete(User $user, Cupon $cupon): bool
    {
        return $user->isOwner() && $user->local_id === $cupon->local_id;
    }

    public function toggle(User $user, Cupon $cupon): bool
    {
        return $user->isOwner() && $user->local_id === $cupon->local_id;
    }
}
