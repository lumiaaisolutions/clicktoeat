<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    /**
     * Cambio de contraseña del propio usuario (super_admin u owner).
     * Requiere la contraseña actual para validar la identidad.
     */
    public function updateOwn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'La contraseña actual es incorrecta.',
                'errors'  => ['current_password' => ['La contraseña actual es incorrecta.']],
            ], 422);
        }

        $user->password = Hash::make($data['password']);
        $user->save();

        // Invalidar tokens existentes excepto el actual (forzar re-login en otros dispositivos)
        $currentToken = $request->user()->currentAccessToken();
        $user->tokens()->where('id', '!=', $currentToken->id)->delete();

        return response()->json(['message' => 'Contraseña actualizada.']);
    }

    /**
     * Super admin resetea la contraseña del owner de un local.
     * No requiere la contraseña actual del owner (reset administrativo).
     */
    public function resetLocalOwner(Local $local, Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
            'user_id'  => ['nullable', 'integer', Rule::exists('users', 'id')],
        ]);

        $query = User::where('local_id', $local->id)->where('rol', 'owner');
        $owner = isset($data['user_id'])
            ? $query->where('id', $data['user_id'])->first()
            : $query->first();

        if (! $owner) {
            return response()->json([
                'message' => 'Este local no tiene un usuario owner asignado.',
            ], 404);
        }

        $owner->password = Hash::make($data['password']);
        $owner->save();

        // Cerrar todas las sesiones del owner — al resetear, debe re-loguearse
        $owner->tokens()->delete();

        return response()->json([
            'message' => 'Contraseña del owner actualizada.',
            'owner'   => [
                'id'     => $owner->id,
                'nombre' => $owner->nombre,
                'email'  => $owner->email,
            ],
        ]);
    }

    /**
     * Devuelve el owner (o lista de usuarios) de un local. Útil para que
     * super_admin sepa a quién le va a resetear la contraseña antes de hacerlo.
     */
    public function localUsers(Local $local): JsonResponse
    {
        $users = User::where('local_id', $local->id)
            ->orderBy('rol')
            ->get(['id', 'nombre', 'email', 'rol']);

        return response()->json(['data' => $users]);
    }
}
