<?php

namespace App\Policies;

use App\Models\Gasto;
use App\Models\User;

/**
 * Auth de gastos operativos.
 *
 * Patrón consistente con CuponPolicy/CategoriaPolicy:
 *  - super_admin bypass via `before`
 *  - owner es quien crea/edita/borra
 *  - staff con permiso 'gastos' lee y crea (no edita ni borra para evitar
 *    fraude de empleado modificando gastos retroactivos)
 */
class GastoPolicy
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

    public function view(User $user, Gasto $gasto): bool
    {
        return $user->local_id === $gasto->local_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Gasto $gasto): bool
    {
        return $user->isOwner() && $user->local_id === $gasto->local_id;
    }

    public function delete(User $user, Gasto $gasto): bool
    {
        return $user->isOwner() && $user->local_id === $gasto->local_id;
    }
}
