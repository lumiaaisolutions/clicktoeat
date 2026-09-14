<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Verificación de correo (doble opt-in). La ruta `verify` es pública: la firma
 * de la URL (middleware `signed`) + el hash del correo son la autenticación —
 * el usuario que hace clic desde su bandeja no trae sesión. `resend` sí es
 * autenticada (botón "reenviar" del panel).
 */
class EmailVerificationController extends Controller
{
    /** GET /email/verify/{id}/{hash} — firmado. Marca verificado y redirige al frontend. */
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $front = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $user = User::find($id);

        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), (string) $hash)) {
            return redirect()->away($front.'/correo-verificado?ok=0');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return redirect()->away($front.'/correo-verificado?ok=1');
    }

    /** POST /email/verification-notification — reenvía (autenticado). */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Tu correo ya está verificado.', 'verified' => true]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Te reenviamos el correo de verificación.']);
    }
}
