<?php

return [
    'name'      => env('APP_NAME', 'ClickToEat'),
    'env'       => env('APP_ENV', 'production'),
    'debug'     => (bool) env('APP_DEBUG', false),
    'url'       => env('APP_URL', 'http://localhost:8080'),
    // URL del frontend Next.js (separado del API). Usado por Mailables y
    // recursos públicos. En prod debe ser FRONTEND_URL=https://clicktoeat...
    'frontend_url' => env('FRONTEND_URL', env('APP_URL_FRONTEND', 'http://localhost:3000')),
    'timezone'  => env('APP_TIMEZONE', 'America/Mexico_City'),
    'locale'    => env('APP_LOCALE', 'es'),
    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),
    'faker_locale'    => env('APP_FAKER_LOCALE', 'es_MX'),
    'cipher'   => 'AES-256-CBC',
    'key'      => env('APP_KEY'),
    'previous_keys' => array_filter(explode(',', (string) env('APP_PREVIOUS_KEYS', ''))),
    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
    ],
];
