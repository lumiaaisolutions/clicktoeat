<?php

namespace App\Policies;

use App\Models\Notificacion;
use App\Models\User;

class NotificacionPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }
        return null;
    }

    public function view(User $user, Notificacion $n): bool
    {
        return $user->local_id === $n->local_id;
    }

    public function update(User $user, Notificacion $n): bool
    {
        return $user->local_id === $n->local_id;
    }
}
