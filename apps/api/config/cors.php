<?php

// SEV-5 — CORS explícito. El origen ya estaba restringido a FRONTEND_URL,
// pero métodos y headers eran wildcard. Aquí los listamos para minimizar
// superficie y exponemos los headers de rate-limit que el cliente necesita
// leer para mostrar "intenta en N segundos".

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('FRONTEND_URL_ADMIN'),    // opcional: subdominio admin separado
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Accept',
        'Accept-Language',
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Idempotency-Key',
        'X-CSRF-TOKEN',
        'X-XSRF-TOKEN',
        'Origin',
    ],

    'exposed_headers' => [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After',
    ],

    'max_age' => 3600,

    'supports_credentials' => true,
];
