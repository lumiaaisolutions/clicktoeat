<?php

namespace App\Services\AI;

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
        private readonly ?string $apiKey  = null,
    ) {}

    /**
     * @param string $prompt
     * @param array $opts ['max_tokens' => 300, 'temperature' => 0.7]
     */
    public function complete(string $prompt, array $opts = []): string
    {
        $provider = $this->provider ?: config('services.ai.provider', 'mock');
        $apiKey   = $this->apiKey   ?: config('services.ai.api_key');

        if ($provider === 'mock' || empty($apiKey)) {
            return $this->mockResponse($prompt);
        }

        try {
            return match ($provider) {
                'anthropic' => $this->anthropic($prompt, $apiKey, $opts),
                'openai'    => $this->openai($prompt, $apiKey, $opts),
                default     => throw new RuntimeException("Provider IA no soportado: {$provider}"),
            };
        } catch (Throwable $e) {
            // Si falla la llamada real, devolvemos mock para no romper la UI
            \Illuminate\Support\Facades\Log::warning("LLM call failed, fallback to mock: {$e->getMessage()}");
            return $this->mockResponse($prompt);
        }
    }

    private function anthropic(string $prompt, string $apiKey, array $opts): string
    {
        $res = \Illuminate\Support\Facades\Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-haiku-4-5-20251001',
            'max_tokens' => $opts['max_tokens'] ?? 300,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ])->throw()->json();

        return $res['content'][0]['text'] ?? '';
    }

    private function openai(string $prompt, string $apiKey, array $opts): string
    {
        $res = \Illuminate\Support\Facades\Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'content-type'  => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model'    => 'gpt-4o-mini',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'max_tokens'  => $opts['max_tokens']  ?? 300,
            'temperature' => $opts['temperature'] ?? 0.7,
        ])->throw()->json();

        return $res['choices'][0]['message']['content'] ?? '';
    }

    /** Stub plausible para dev/CI sin gastar tokens reales. */
    private function mockResponse(string $prompt): string
    {
        $lower = mb_strtolower($prompt);
        if (str_contains($lower, 'sugerencia') && str_contains($lower, 'precio')) {
            return "Este producto está 12% por encima del promedio de su categoría y sus ventas cayeron 23% el último mes. Sugerencia: bajar a \$95 MXN por 2 semanas y promocionar como 'oferta del mes'.";
        }
        if (str_contains($lower, 'predicción') || str_contains($lower, 'demanda')) {
            return "Para mañana esperamos ~32 pedidos basado en el promedio de los últimos 4 viernes. Producto más solicitado: Pizza Pepperoni (estimado 9 unidades). Riesgo de stock bajo: queso mozzarella (alcanzas para 7 pizzas, prepara 12 más).";
        }
        if (str_contains($lower, 'mensaje') && str_contains($lower, 'cliente')) {
            return "¡Hola María! Tu Pizza Hawaiana ya está en el horno. Estará lista para recoger en aprox. 18 minutos. ¡Gracias por elegirnos!";
        }
        return 'Esta es una respuesta de prueba del proveedor IA mock. Configura ANTHROPIC_API_KEY o OPENAI_API_KEY para respuestas reales.';
    }
}
