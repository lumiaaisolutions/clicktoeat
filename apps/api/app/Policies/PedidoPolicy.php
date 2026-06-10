<?php

namespace App\Policies;

use App\Models\Pedido;
use App\Models\User;

class PedidoPolicy
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

    public function view(User $user, Pedido $pedido): bool
    {
        return $user->local_id === $pedido->local_id;
    }

    public function updateEstado(User $user, Pedido $pedido): bool
    {
        return ($user->isOwner() || $user->rol === 'staff')
            && $user->local_id === $pedido->local_id;
    }

    public function delete(User $user, Pedido $pedido): bool
    {
        return $user->isOwner() && $user->local_id === $pedido->local_id;
    }
}
