<?php

return [
    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
        'api_key' => env('CLOUDINARY_API_KEY'),
        'api_secret' => env('CLOUDINARY_API_SECRET'),
        'folder' => env('CLOUDINARY_FOLDER', 'clickeat'),
    ],

    'ai' => [
        // Provider genérico para features IA futuras (sugerencia de precio,
        // predicción de demanda, etc — ver docs/features/ia-features.md).
        'provider' => env('AI_PROVIDER', 'mock'),
        'api_key' => env('ANTHROPIC_API_KEY') ?: env('OPENAI_API_KEY'),

        // Ollama self-hosted (mismo VPS, el que ya usa n8n) — sin API key.
        'ollama_url' => rtrim(env('OLLAMA_URL', 'http://localhost:11434'), '/'),
        'ollama_model' => env('OLLAMA_MODEL', 'llama3.1'),
        'ollama_keep_alive' => env('OLLAMA_KEEP_ALIVE', '30m'),

        // Clicky (F103): provider propio, independiente del genérico de
        // arriba. En prod se usa `ollama` (VPS local, sin cuota); `gemini`
        // queda como alterno — ver docs/features/clicky-assistant.md.
        'clicky_provider' => env('CLICKY_PROVIDER', 'gemini'),
        'gemini_api_key' => env('GEMINI_API_KEY'),
        'gemini_model' => env('GEMINI_MODEL', 'gemini-2.0-flash-lite'),
    ],
];
