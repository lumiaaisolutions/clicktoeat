<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Verificador de tokens de Cloudflare Turnstile.
 *
 * Gated por `services.turnstile.secret`: si el secret está vacío/ausente la
 * verificación es un no-op (return true) para que el deploy sin llaves se
 * comporte exactamente como hoy. Con secret configurado, un token vacío o
 * inválido devuelve false.
 */
class TurnstileVerifier
{
    private const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function verify(?string $token, ?string $ip): bool
    {
        $secret = (string) config('services.turnstile.secret');

        // Deshabilitado: sin secret, la protección es un no-op.
        if ($secret === '') {
            return true;
        }

        // Con secret pero sin token no hay nada que verificar.
        if (empty($token)) {
            return false;
        }

        try {
            $resp = Http::asForm()
                ->timeout(5)
                ->post(self::ENDPOINT, [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $ip,
                ]);

            return $resp->json('success') === true;
        } catch (Throwable) {
            return false;
        }
    }
}
