<?php

use Laravel\Sanctum\Sanctum;

return [
    'stateful' => explode(',', (string) env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        Sanctum::currentApplicationUrlWithPort(),
    ))),

    'guard' => ['web'],

    // Tokens expiran a los 7 días (10080 minutos). SEV-1 de la auditoría:
    // sin expiración, un token leak via XSS/log/device perdido es válido para
    // siempre. El frontend debe manejar 401 con re-login o refresh.
    'expiration' => 60 * 24 * 7,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies'      => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token'  => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
