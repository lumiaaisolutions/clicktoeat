<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * @OA\Tag(name="Password reset", description="Forgot + reset por email (link al frontend).")
 */
class PasswordResetController extends Controller
{
    /**
     * @OA\Post(
     *     path="/auth/forgot-password",
     *     tags={"Password reset"},
     *     summary="Envía email con link de reset si el email existe (responde 200 siempre — no revela existencia).",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"email"},
     *         @OA\Property(property="email", type="string", format="email")
     *     )),
     *     @OA\Response(response=200, description="Mensaje genérico (no confirma si el email existe)")
     * )
     */
    public function sendResetLink(ForgotPasswordRequest $request): JsonResponse
    {
        // El broker de Laravel maneja:
        //  - generación del token (hasheado en password_reset_tokens)
        //  - envío de la Notification al user
        //  - rate limit interno (throttle de 60s por user)
        Password::sendResetLink($request->only('email'));

        // SIEMPRE 200 — no revelamos si el email existe (evita user enumeration).
        return response()->json([
            'message' => 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
        ]);
    }

    /**
     * @OA\Post(
     *     path="/auth/reset-password",
     *     tags={"Password reset"},
     *     summary="Aplica el reset usando el token recibido por email.",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"token","email","password","password_confirmation"},
     *         @OA\Property(property="token", type="string"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string", format="password", minLength=8),
     *         @OA\Property(property="password_confirmation", type="string")
     *     )),
     *     @OA\Response(response=200, description="OK"),
     *     @OA\Response(response=422, description="Token inválido o expirado")
     * )
     */
    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Invalidar TODOS los tokens Sanctum — el usuario debe re-loguear
                // en cualquier dispositivo (incluido el actual).
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Contraseña restablecida correctamente. Inicia sesión.',
            ]);
        }

        // Status posibles: INVALID_TOKEN, INVALID_USER
        return response()->json([
            'message' => __($status),
            'errors'  => ['email' => [__($status)]],
        ], 422);
    }
}
