<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

/**
 * F89 — Self-service signup completo.
 *
 * Flujo:
 *   1. POST /auth/signup-prospect  (esta función) — crea user con rol 'owner'
 *      SIN local asignado todavía. Devuelve token.
 *   2. Frontend muestra /onboarding/elegir-plan con los planes activos.
 *   3. Al elegir plan → POST /billing/checkout pasa el plan_slug. El flow
 *      de checkout existente crea la sesión Stripe.
 *   4. Webhook `checkout.session.completed` ya crea Local + asigna owner.
 */
class SignupController extends Controller
{
    public function prospect(Request $req): JsonResponse
    {
        $data = $req->validate([
            'nombre'   => ['required', 'string', 'min:2', 'max:120'],
            'email'    => ['required', 'email:rfc', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'nombre'   => $data['nombre'],
            'email'    => strtolower(trim($data['email'])),
            'password' => Hash::make($data['password']),
            'rol'      => 'owner',
            'local_id' => null, // se asigna cuando completa checkout
            'email_verified_at' => now(),
        ]);

        // Token con abilities mínimos para alta de plan
        $token = $user->createToken('signup-prospect', ['*'])->plainTextToken;

        return response()->json([
            'user'  => $user->only(['id', 'nombre', 'email', 'rol']),
            'token' => $token,
        ], 201);
    }
}
