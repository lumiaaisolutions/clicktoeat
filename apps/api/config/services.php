<?php

return [
    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
        'api_key'    => env('CLOUDINARY_API_KEY'),
        'api_secret' => env('CLOUDINARY_API_SECRET'),
        'folder'     => env('CLOUDINARY_FOLDER', 'clickeat'),
    ],

    'ai' => [
        // Provider genérico para features IA futuras (sugerencia de precio,
        // predicción de demanda, etc — ver docs/features/ia-features.md).
        'provider' => env('AI_PROVIDER', 'mock'),
        'api_key'  => env('ANTHROPIC_API_KEY') ?: env('OPENAI_API_KEY'),

        // Clicky (F103) usa Gemini de forma fija, independiente del provider
        // genérico de arriba — ver docs/features/clicky-assistant.md.
        'gemini_api_key' => env('GEMINI_API_KEY'),
        'gemini_model'   => env('GEMINI_MODEL', 'gemini-2.0-flash-lite'),
    ],
];
