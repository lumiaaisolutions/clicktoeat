<?php

return [
    'public_key'     => env('STRIPE_PUBLIC_KEY'),
    'secret_key'     => env('STRIPE_SECRET_KEY'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),

    'prices' => [
        'essential'    => env('STRIPE_PRICE_ESSENTIAL'),
        'professional' => env('STRIPE_PRICE_PROFESSIONAL'),
        'premium'      => env('STRIPE_PRICE_PREMIUM'),
    ],

    'trial_days'              => (int) env('SAAS_TRIAL_DAYS', 14),
    'grace_days_past_due'     => (int) env('SAAS_GRACE_DAYS_PAST_DUE', 3),
    'onboarding_token_ttl_h'  => (int) env('SAAS_ONBOARDING_TOKEN_TTL_HOURS', 24),

    // URLs de retorno
    'success_url'  => env('STRIPE_SUCCESS_URL', env('APP_URL_FRONTEND', 'http://localhost:3000').'/onboarding?session_id={CHECKOUT_SESSION_ID}'),
    'cancel_url'   => env('STRIPE_CANCEL_URL',  env('APP_URL_FRONTEND', 'http://localhost:3000').'/?canceled=true'),
    'portal_return_url' => env('STRIPE_PORTAL_RETURN_URL', env('APP_URL_FRONTEND', 'http://localhost:3000').'/admin/billing'),

    'locale' => env('STRIPE_LOCALE', 'es-419'),
];
