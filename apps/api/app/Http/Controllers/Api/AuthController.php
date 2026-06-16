<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(name="Auth", description="Sign-up, sign-in y tokens Sanctum.")
 */
class AuthController extends Controller
{
    /**
     * @OA\Post(
     *     path="/auth/register",
     *     tags={"Auth"},
     *     summary="Registrar un usuario nuevo (owner de un local futuro).",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"nombre","email","password","password_confirmation"},
     *         @OA\Property(property="nombre", type="string", example="María Pérez"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string", format="password", minLength=8),
     *         @OA\Property(property="password_confirmation", type="string")
     *     )),
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'nombre'   => $request->string('nombre'),
            'email'    => $request->string('email'),
            'password' => Hash::make($request->string('password')),
            'rol'      => 'owner',  // el super_admin solo se crea por seeder
        ]);

        $token = $user->createToken('register-'.now()->timestamp)->plainTextToken;

        return response()->json([
            'user'  => $user->only(['id', 'nombre', 'email', 'rol', 'local_id']),
            'token' => $token,
        ], 201);
    }

    /**
     * @OA\Post(
     *     path="/auth/login",
     *     tags={"Auth"},
     *     summary="Login con email + password. Regresa Sanctum bearer token.",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"email","password"},
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string", format="password"),
     *         @OA\Property(property="device", type="string", description="Nombre legible del dispositivo")
     *     )),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $key = 'login:'.$request->ip().':'.strtolower($request->input('email'));

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            // Devolvemos JSON 429 directo — `ValidationException::status(429)`
            // es ignorado por Laravel (siempre fuerza 422 para ValidationException).
            return response()->json([
                'message' => "Demasiados intentos. Intenta de nuevo en {$seconds}s.",
                'errors'  => ['email' => ["Demasiados intentos. Intenta de nuevo en {$seconds}s."]],
            ], 429);
        }

        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        // 2FA: si el user tiene 2FA confirmado, exigir el código TOTP.
        if ($user->hasTwoFactorEnabled()) {
            $otp = (string) $request->input('otp', '');
            if ($otp === '') {
                // Respuesta especial: el frontend muestra el input de 2FA y reintenta.
                return response()->json([
                    'two_factor_required' => true,
                    'message' => 'Tu cuenta tiene 2FA activado. Ingresa tu código.',
                ], 200);
            }
            // Permitir recovery codes
            $recoveryOk = false;
            if ($user->two_factor_recovery_codes) {
                $codes = json_decode(\Illuminate\Support\Facades\Crypt::decryptString($user->two_factor_recovery_codes), true) ?? [];
                if (in_array(strtoupper($otp), array_map('strtoupper', $codes), true)) {
                    $codes = array_values(array_filter($codes, fn ($c) => strtoupper($c) !== strtoupper($otp)));
                    $user->two_factor_recovery_codes = \Illuminate\Support\Facades\Crypt::encryptString(json_encode($codes));
                    $user->save();
                    $recoveryOk = true;
                }
            }
            if (! $recoveryOk) {
                $secret = \Illuminate\Support\Facades\Crypt::decryptString($user->two_factor_secret);
                $valid  = (new \PragmaRX\Google2FA\Google2FA())->verifyKey($secret, $otp);
                if (! $valid) {
                    RateLimiter::hit($key, 60);
                    throw ValidationException::withMessages([
                        'otp' => ['Código 2FA incorrecto.'],
                    ]);
                }
            }
        }

        RateLimiter::clear($key);

        $device = $request->input('device') ?: 'web';
        $token  = $user->createToken($device, $this->abilitiesFor($user))->plainTextToken;

        return response()->json([
            'user'  => $user->only(['id', 'nombre', 'email', 'rol', 'local_id']),
            'token' => $token,
        ]);
    }

    /**
     * @OA\Get(
     *     path="/auth/me",
     *     tags={"Auth"},
     *     summary="Devuelve el usuario autenticado.",
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('local.plan');

        // Exponer permisos efectivos (owner/super_admin = todos; staff = listados o default)
        $payload = $user->toArray();
        $payload['permisos'] = $user->permisosEfectivos();

        $local = $user->local;
        $plan  = $local?->plan;

        return response()->json([
            'user' => $payload,
            // Plan + status del SaaS para que el frontend pueda hacer gating
            'plan' => $plan ? [
                'slug'                   => $plan->slug,
                'nombre'                 => $plan->nombre,
                'features'               => $plan->features ?? [],
                'limits' => [
                    'productos'  => $plan->max_productos,
                    'categorias' => $plan->max_categorias,
                    'staff'      => $plan->max_staff,
                ],
                'status'                 => $local->plan_status,
                'trial_ends_at'          => $local->trial_ends_at?->toIso8601String(),
                'current_period_ends_at' => $local->current_period_ends_at?->toIso8601String(),
                'is_active'              => $local->hasActivePlan(),
            ] : null,
        ]);
    }

    /**
     * @OA\Post(
     *     path="/auth/logout",
     *     tags={"Auth"},
     *     summary="Revoca el token actual.",
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=204, description="No Content")
     * )
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    protected function abilitiesFor(User $user): array
    {
        return match ($user->rol) {
            'super_admin' => ['*'],
            'owner'       => ['local:*', 'productos:*', 'pedidos:*', 'inventario:*'],
            'staff'       => ['pedidos:read', 'pedidos:update'],
            default       => [],
        };
    }
}
