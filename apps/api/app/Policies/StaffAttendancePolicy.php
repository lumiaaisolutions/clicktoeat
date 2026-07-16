<?php

namespace App\Policies;

use App\Models\StaffAttendance;
use App\Models\User;

class StaffAttendancePolicy
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

    /** Registrar/consultar la propia entrada-salida: cualquier staff del local. */
    public function manage(User $user, StaffAttendance $attendance): bool
    {
        return $user->local_id === $attendance->local_id && $user->id === $attendance->user_id;
    }

    /** Corregir/borrar un registro de asistencia ajeno: solo el owner. */
    public function delete(User $user, StaffAttendance $attendance): bool
    {
        return $user->local_id === $attendance->local_id && $user->isOwner();
    }
}
