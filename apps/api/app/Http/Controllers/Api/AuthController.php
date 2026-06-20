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
        // SEV-10 — Rate limit en 3 capas independientes para que un atacante
        // con un pool de IPs no pueda evadir el cap por cuenta y para que un
        // atacante en una sola IP no pueda hacer DoS de una cuenta ajena.
        //
        // TODO: Cuando tengamos llaves de Cloudflare Turnstile (o hCaptcha),
        // exigir token tras 3 fallos seguidos. Esto frena el credential
        // stuffing automatizado incluso si el atacante respeta los límites.
        $email      = strtolower((string) $request->input('email'));
        $emailKey   = 'login:email:'.$email;
        $ipKey      = 'login:ip:'.$request->ip();
        $globalKey  = 'login:global';
        $emailWindow  = 60 * 15;  // 15 min — bloqueo por cuenta
        $ipWindow     = 60 * 15;
        $globalWindow = 60 * 15;

        foreach ([
            [$emailKey,  5,    'Demasiados intentos para esta cuenta.'],
            [$ipKey,     50,   'Demasiados intentos desde esta dirección.'],
            [$globalKey, 5000, 'El servicio está bajo presión, intenta más tarde.'],
        ] as [$key, $limit, $msg]) {
            if (RateLimiter::tooManyAttempts($key, $limit)) {
                $seconds = RateLimiter::availableIn($key);
                // 429 JSON directo — `ValidationException::status(429)` lo ignora Laravel.
                return response()->json([
                    'message' => "{$msg} Intenta de nuevo en {$seconds}s.",
                    'errors'  => ['email' => ["{$msg} Intenta de nuevo en {$seconds}s."]],
                ], 429)->header('Retry-After', (string) $seconds);
            }
        }

        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            // Incrementa los 3 contadores — un atacante que prueba muchos
            // emails desde una IP cae primero por ipKey; un atacante
            // distribuido golpea emailKey de una víctima específica.
            RateLimiter::hit($emailKey,  $emailWindow);
            RateLimiter::hit($ipKey,     $ipWindow);
            RateLimiter::hit($globalKey, $globalWindow);
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
                    RateLimiter::hit($emailKey,  $emailWindow);
                    RateLimiter::hit($ipKey,     $ipWindow);
                    RateLimiter::hit($globalKey, $globalWindow);
                    throw ValidationException::withMessages([
                        'otp' => ['Código 2FA incorrecto.'],
                    ]);
                }
            }
        }

        RateLimiter::clear($emailKey);
        RateLimiter::clear($ipKey);

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

        // F100g — Auto-heal de trial_ends_at: locales legacy o marcados como
        // `trialing` por super_admin sin fecha quedaban con `trial_ends_at = null`
        // y el frontend no podía mostrar el contador "termina en X días". Si lo
        // detectamos al leer /me, seteamos 14 días desde HOY (genérico — el super
        // admin puede ajustar manualmente desde el panel si necesita otro plazo).
        if ($local && $local->plan_status === 'trialing' && empty($local->trial_ends_at)) {
            $local->forceFill(['trial_ends_at' => now()->addDays(14)])->save();
        }

        return response()->json([
            'user' => $payload,
            // Plan + status del SaaS para que el frontend pueda hacer gating
            'plan' => $plan ? [
                'slug'                   => $plan->slug,
                'nombre'                 => $plan->nombre,
                // F100 — precio real del plan (no hardcoded en frontend)
                'precio_mxn'             => (int) round($plan->precio_mxn_centavos / 100),
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
                // F100g — el frontend lo usa para decidir si abre el Stripe
                // Customer Portal (requiere customer) o redirige a checkout.
                'has_stripe_customer'    => ! empty($local->stripe_customer_id),
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
