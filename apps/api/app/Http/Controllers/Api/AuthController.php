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
            throw ValidationException::withMessages([
                'email' => ["Demasiados intentos. Intenta de nuevo en {$seconds}s."],
            ])->status(429);
        }

        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
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
        $user = $request->user()->load('local');

        return response()->json(['user' => $user]);
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
