<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\Cookie;

/**
 * SEV-2 — cookie HttpOnly que transporta el token Sanctum del frontend web.
 *
 * `CookieToBearer` la convierte en header Authorization en cada request.
 * El frontend web NO persiste el token en localStorage (vector XSS → ATO
 * cerrado); mobile/API externa siguen usando el bearer del JSON.
 *
 * Dominio: `config('session.domain')` — en producción `.lumiaaisolutions.com`
 * para que la cookie viaje entre clicktoeat y clicktoeat-api (same-site).
 * TTL alineado con `config/sanctum.php:expiration` (7 días).
 */
final class AuthCookie
{
    public const NAME = 'cte_token';

    public static function make(string $token): Cookie
    {
        return cookie(
            self::NAME,
            $token,
            60 * 24 * 7,                // minutes (7 días)
            '/',
            config('session.domain'),   // null en dev, .lumiaaisolutions.com en prod
            app()->isProduction(),      // secure
            true,                       // httpOnly
            false,                      // raw
            'Lax',                      // sameSite
        );
    }

    public static function forget(): Cookie
    {
        return \Illuminate\Support\Facades\Cookie::forget(self::NAME, '/', config('session.domain'));
    }
}
