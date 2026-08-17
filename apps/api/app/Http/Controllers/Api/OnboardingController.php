<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WelcomeMail;
use App\Models\Local;
use App\Models\OnboardingToken;
use App\Models\Referral;
use App\Models\User;
use App\Services\Images\ImageUploader;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wizard de 5 pasos post-checkout. Cada paso valida y persiste sus datos.
 * El paso `finalizar` marca el token usado y emite un Sanctum bearer
 * permanente para que el frontend redirija al admin.
 *
 * Auth: `Authorization: Bearer <onboarding_token>` (NO Sanctum). El token
 * vive en `onboarding_tokens.value` y se emite en
 * `BillingController::session()` tras un checkout exitoso.
 */
class OnboardingController extends Controller
{
    /** Paso 1 — set password del owner + email */
    public function password(Request $req): JsonResponse
    {
        $token = $this->resolveToken($req);
        $local = $token->local;

        // Si `BillingController::session()` ya vinculó este local a un
        // usuario existente (flujo /registro → checkout con
        // client_reference_id=user:N), no hay nada que crear/validar — el
        // owner ya existe. Sin este check, un usuario que navega "Atrás" al
        // paso ya saltado por el frontend chocaba con Rule::unique(email) y
        // quedaba atorado repitiendo el checkout (incidente real en prod).
        if ($local->owner_id) {
            $owner = User::find($local->owner_id);
            if ($owner) {
                $token->markStepCompleted('password');

                return response()->json([
                    'completed_steps' => $token->completed_steps,
                    'user_id' => $owner->id,
                ]);
            }
        }

        // Mensaje específico — el genérico de Laravel ("The given data was
        // invalid.") no le decía al usuario que el problema era un email ya
        // registrado, ni que debía iniciar sesión en vez de reintentar el
        // checkout (eso fue justo lo que causó los locales huérfanos
        // duplicados del incidente 2026-07-06).
        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'email.unique' => 'Ese correo ya tiene una cuenta. Inicia sesión en su lugar en vez de crear una nueva.',
        ]);

        // Crear owner. Si ya existía un owner asociado al local (raro), lo dejamos.
        $owner = User::where('local_id', $local->id)->where('rol', 'owner')->first();
        if (! $owner) {
            $owner = User::create([
                'nombre' => $data['nombre'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'rol' => 'owner',
                'local_id' => $local->id,
            ]);
            $local->update(['owner_id' => $owner->id]);
        } else {
            $owner->update([
                'nombre' => $data['nombre'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);
        }

        $token->markStepCompleted('password');

        return response()->json([
            'completed_steps' => $token->completed_steps,
            'user_id' => $owner->id,
        ]);
    }

    /** Paso 2 — nombre + slug + tagline del local + opcional código de referido */
    public function local(Request $req): JsonResponse
    {
        $token = $this->resolveToken($req);

        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'min:3', 'max:60', 'regex:/^[a-z0-9-]+$/',
                Rule::unique('locales', 'slug')->ignore($token->local_id)],
            'tagline' => ['nullable', 'string', 'max:160'],
            'codigo_referido' => ['nullable', 'string', 'max:32'],
        ]);

        $token->local->update([
            'nombre' => $data['nombre'],
            'slug' => $data['slug'],
            'tagline' => $data['tagline'] ?? null,
        ]);
        $token->markStepCompleted('local');

        // F36 — Si traen un código de referido válido y NO es del propio local,
        // creamos un Referral pending. Cuando este local pague su 1ª factura,
        // el webhook le aplica el descuento al referrer (ver WebhookHandler).
        if (! empty($data['codigo_referido'])) {
            $code = strtoupper(trim($data['codigo_referido']));
            $referrer = Local::withoutGlobalScopes()
                ->where('codigo_referido', $code)
                ->where('activo', true)
                ->first();
            if ($referrer && $referrer->id !== $token->local_id) {
                $referral = Referral::firstOrCreate(
                    [
                        'referrer_local_id' => $referrer->id,
                        'referred_local_id' => $token->local_id,
                    ],
                    ['status' => 'pending'],
                );
                Log::info('Referral pending creado', [
                    'referral_id' => $referral->id,
                    'referrer_local_id' => $referrer->id,
                    'referred_local_id' => $token->local_id,
                    'codigo' => $code,
                    'was_created' => $referral->wasRecentlyCreated,
                ]);
            } else {
                Log::info('Código de referido NO aplicado', [
                    'codigo' => $code,
                    'reason' => $referrer ? 'self_referral' : 'codigo_invalido_o_local_inactivo',
                    'local_id' => $token->local_id,
                ]);
            }
        }

        return response()->json([
            'completed_steps' => $token->completed_steps,
            'local' => $token->local->only(['id', 'nombre', 'slug', 'tagline']),
        ]);
    }

    /**
     * Upload de imagen durante onboarding (logo/banner). Autenticado por
     * el bearer onboarding_token, reusa el ImageUploader service.
     */
    public function uploadImagen(Request $req, ImageUploader $uploader): JsonResponse
    {
        $this->resolveToken($req);  // valida token
        // Misma regla que StoreImageRequest (Upload/branding) — `image` de
        // Laravel no reconoce AVIF (whitelist hardcodeada sin avif), así que
        // usamos `mimetypes` con content-sniffing real en su lugar.
        $req->validate([
            'image' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/avif', 'max:5120'],     // 5 MB
            'folder' => ['nullable', 'string', 'in:logos,banners,locales'],
        ]);
        $result = $uploader->upload(
            $req->file('image'),
            $req->input('folder', 'locales'),
        );

        return response()->json(['data' => $result], 201);
    }

    /** Paso 3 — branding (colores + logo + banner) */
    public function branding(Request $req): JsonResponse
    {
        $token = $this->resolveToken($req);

        $data = $req->validate([
            'logo_url' => ['nullable', 'url'],
            'banner_url' => ['nullable', 'url'],
            'color_primario' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_secundario' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_fondo' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        $token->local->update($data);
        $token->markStepCompleted('branding');

        return response()->json([
            'completed_steps' => $token->completed_steps,
        ]);
    }

    /** Paso 4 — WhatsApp + dirección + horarios */
    public function contacto(Request $req): JsonResponse
    {
        $token = $this->resolveToken($req);

        $data = $req->validate([
            'whatsapp' => ['required', 'string', 'regex:/^\d{8,16}$/'],
            'telefono' => ['nullable', 'string', 'max:30'],
            'direccion' => ['nullable', 'string', 'max:240'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'horarios' => ['nullable', 'array'],
        ]);

        $token->local->update($data);
        $token->markStepCompleted('contacto');

        return response()->json([
            'completed_steps' => $token->completed_steps,
        ]);
    }

    /**
     * Paso 5 — finalizar: marca token usado y emite un Sanctum bearer permanente.
     */
    public function finalizar(Request $req): JsonResponse
    {
        $token = $this->resolveToken($req);

        $owner = User::where('local_id', $token->local_id)->where('rol', 'owner')->first();
        if (! $owner) {
            return response()->json([
                'message' => 'Onboarding incompleto: falta crear la cuenta del dueño (paso "password").',
                'code' => 'ONBOARDING_INCOMPLETE',
            ], 422);
        }

        // Marcar usado dentro de transacción para evitar dobles emisiones.
        DB::transaction(function () use ($token) {
            $token->refresh();
            if ($token->used_at !== null) {
                abort(409, 'Token ya consumido.');
            }
            $token->used_at = now();
            $token->markStepCompleted('finalizar');
            $token->save();
        });

        $sanctum = $owner->createToken('onboarding-'.now()->timestamp, ['owner'])->plainTextToken;

        // Email de bienvenida — non-blocking
        rescue(function () use ($token, $owner) {
            Mail::to($owner->email)
                ->send(new WelcomeMail($token->local->fresh(), $owner));
        }, report: false);

        // SEV-2 — la sesión web viaja en cookie HttpOnly; el token del JSON
        // es respaldo transitorio (setTokenAndHydrate) para esta misma página.
        return response()->json([
            'token' => $sanctum,
            'user' => $owner->only(['id', 'nombre', 'email', 'rol', 'local_id']),
            'local' => $token->local->only(['id', 'nombre', 'slug']),
            'next' => '/admin',
        ])->withCookie(AuthCookie::make($sanctum));
    }

    /**
     * Resuelve el `OnboardingToken` desde el header `Authorization: Bearer …`.
     * Aborta 401/410 si no existe / expiró / ya se usó.
     */
    private function resolveToken(Request $req): OnboardingToken
    {
        $raw = $req->bearerToken();
        if (! $raw) {
            abort(response()->json(['message' => 'Falta onboarding_token'], Response::HTTP_UNAUTHORIZED));
        }

        $token = OnboardingToken::where('value', $raw)->first();
        if (! $token) {
            abort(response()->json(['message' => 'Token inválido'], Response::HTTP_UNAUTHORIZED));
        }
        if ($token->used_at !== null) {
            abort(response()->json(['message' => 'Token ya consumido. Inicia sesión normalmente.'], Response::HTTP_GONE));
        }
        if ($token->expires_at->isPast()) {
            abort(response()->json(['message' => 'Token expirado. Contacta a soporte.'], Response::HTTP_GONE));
        }

        return $token;
    }
}
