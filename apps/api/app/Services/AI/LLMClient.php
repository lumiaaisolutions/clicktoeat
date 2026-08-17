<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Cliente LLM genérico (Anthropic Claude por default; OpenAI alternativo
 * si swap del ENV `AI_PROVIDER`). Skeleton — implementación real activable
 * cuando se decida pagar el provider.
 *
 * Si `AI_PROVIDER=mock` (default), devuelve respuestas plausibles
 * pre-armadas para que la UI quede integrada sin costo.
 */
class LLMClient
{
    public function __construct(
        private readonly string $provider = '',
        private readonly ?string $apiKey = null,
    ) {}

    /**
     * @param  array  $opts  ['max_tokens' => 300, 'temperature' => 0.7]
     */
    public function complete(string $prompt, array $opts = []): string
    {
        $provider = $this->provider ?: config('services.ai.provider', 'mock');
        $apiKey = $this->apiKey ?: config('services.ai.api_key');

        // Ollama es self-hosted: no requiere api_key.
        if ($provider === 'mock' || ($provider !== 'ollama' && empty($apiKey))) {
            return $opts['fallback'] ?? $this->mockResponse($prompt);
        }

        try {
            return match ($provider) {
                'anthropic' => $this->anthropic($prompt, $apiKey, $opts),
                'openai' => $this->openai($prompt, $apiKey, $opts),
                'gemini' => $this->gemini($prompt, $apiKey, $opts),
                'ollama' => $this->ollama($prompt, $opts),
                default => throw new RuntimeException("Provider IA no soportado: {$provider}"),
            };
        } catch (Throwable $e) {
            // Si falla la llamada real, caemos a un fallback — nunca al
            // usuario final le llega un detalle interno (config, API keys).
            // `opts['fallback']` deja que cada feature defina su propio
            // mensaje "de cara al cliente"; si no lo pasa, usamos el mock
            // genérico (pensado para dev/CI, no para producción real).
            Log::warning("LLM call failed, fallback: {$e->getMessage()}");

            return $opts['fallback'] ?? $this->mockResponse($prompt);
        }
    }

    private function anthropic(string $prompt, string $apiKey, array $opts): string
    {
        $res = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => $opts['max_tokens'] ?? 300,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ])->throw()->json();

        return $res['content'][0]['text'] ?? '';
    }

    private function openai(string $prompt, string $apiKey, array $opts): string
    {
        $res = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'content-type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'max_tokens' => $opts['max_tokens'] ?? 300,
            'temperature' => $opts['temperature'] ?? 0.7,
        ])->throw()->json();

        return $res['choices'][0]['message']['content'] ?? '';
    }

    /**
     * Gemini (Google Generative Language API). Usado por Clicky — modelo
     * "flash-lite" a propósito: es el más barato/rápido del catálogo Gemini,
     * suficiente para respuestas cortas de onboarding (no razonamiento complejo).
     */
    private function gemini(string $prompt, string $apiKey, array $opts): string
    {
        $model = $opts['model'] ?? config('services.ai.gemini_model', 'gemini-2.0-flash-lite');
        $body = ['contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]]];
        if (! empty($opts['system'])) {
            $body['systemInstruction'] = ['parts' => [['text' => $opts['system']]]];
        }
        $body['generationConfig'] = [
            'maxOutputTokens' => $opts['max_tokens'] ?? 220,
            'temperature' => $opts['temperature'] ?? 0.4,
        ];

        $res = Http::withHeaders([
            'content-type' => 'application/json',
        ])->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
            $body,
        )->throw()->json();

        return $res['candidates'][0]['content']['parts'][0]['text'] ?? '';
    }

    /**
     * Ollama (self-hosted, mismo VPS — el que ya usa n8n). Sin API key ni
     * cuota: por eso Clicky lo prefiere en producción sobre Gemini, que
     * quedó bloqueado por quota 429 (ago 2026).
     */
    private function ollama(string $prompt, array $opts): string
    {
        $messages = [];
        if (! empty($opts['system'])) {
            $messages[] = ['role' => 'system', 'content' => $opts['system']];
        }
        $messages[] = ['role' => 'user', 'content' => $prompt];

        $res = Http::timeout(60)->post(
            config('services.ai.ollama_url').'/api/chat',
            [
                'model' => $opts['model'] ?? config('services.ai.ollama_model'),
                'stream' => false,
                'messages' => $messages,
                'options' => [
                    'num_predict' => $opts['max_tokens'] ?? 300,
                    'temperature' => $opts['temperature'] ?? 0.7,
                ],
            ],
        )->throw()->json();

        return $res['message']['content'] ?? '';
    }

    /** Stub plausible para dev/CI sin gastar tokens reales. */
    private function mockResponse(string $prompt): string
    {
        $lower = mb_strtolower($prompt);
        if (str_contains($lower, 'sugerencia') && str_contains($lower, 'precio')) {
            return "Este producto está 12% por encima del promedio de su categoría y sus ventas cayeron 23% el último mes. Sugerencia: bajar a \$95 MXN por 2 semanas y promocionar como 'oferta del mes'.";
        }
        if (str_contains($lower, 'predicción') || str_contains($lower, 'demanda')) {
            return 'Para mañana esperamos ~32 pedidos basado en el promedio de los últimos 4 viernes. Producto más solicitado: Pizza Pepperoni (estimado 9 unidades). Riesgo de stock bajo: queso mozzarella (alcanzas para 7 pizzas, prepara 12 más).';
        }
        if (str_contains($lower, 'mensaje') && str_contains($lower, 'cliente')) {
            return '¡Hola María! Tu Pizza Hawaiana ya está en el horno. Estará lista para recoger en aprox. 18 minutos. ¡Gracias por elegirnos!';
        }

        return 'Esta es una respuesta de prueba del proveedor IA mock. Configura ANTHROPIC_API_KEY o OPENAI_API_KEY para respuestas reales.';
    }
}
