<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AskClickyRequest;
use App\Services\AI\LLMClient;
use Illuminate\Http\JsonResponse;

/**
 * Clicky (F103) — asistente conversacional del panel. Solo responde dudas
 * de "cómo uso ClickToEat"; para "dónde pulsar" el frontend ya resuelve la
 * mayoría con los tours scripteados de `components/help/tours.ts` (gratis,
 * sin LLM). Este endpoint es el fallback para preguntas libres que no
 * calzan en el guion — ver docs/features/clicky-assistant.md.
 *
 * Gateado por `feature:clicky_assistant` (Professional/Premium) y
 * `throttle:clicky` (40/día por local) en routes/api.php.
 */
class ClickyController extends Controller
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
Eres "Clicky", el asistente de ayuda dentro del panel de administración del
SaaS ClickToEat (dueños de restaurantes/locales gestionando su menú, pedidos,
inventario y ventas por WhatsApp). Respondes SOLO preguntas sobre cómo usar
el panel de ClickToEat: dónde está cada sección, cómo crear/editar productos,
categorías, cupones, pedidos, inventario, staff, branding, QR, horarios,
métricas, billing/plan.

Reglas estrictas:
- Responde siempre en español, tono cercano y directo, máximo 4 frases.
- Si la pregunta no tiene que ver con usar el panel de ClickToEat (temas
  generales, código, otras apps, temas personales), responde amablemente
  que solo puedes ayudar con el uso del panel de ClickToEat.
- No inventes funciones, precios ni datos del negocio del usuario — si no
  sabes algo con certeza, dilo y sugiere contactar a soporte.
- No pidas ni proceses contraseñas, tarjetas ni datos sensibles.
- Cuando menciones dónde hacer algo, usa el nombre de la sección del menú
  lateral (ej. "Productos", "Pedidos", "Inventario", "Cupones", "Código QR").
PROMPT;

    public function ask(AskClickyRequest $req): JsonResponse
    {
        $client = new LLMClient('gemini', config('services.ai.gemini_api_key'));

        $userMessage = sprintf(
            "Pantalla actual del panel: %s\nPregunta del usuario: %s",
            $req->input('pathname') ?: 'desconocida',
            $req->input('message'),
        );

        $reply = $client->complete($userMessage, [
            'system'      => self::SYSTEM_PROMPT,
            'max_tokens'  => 220,
            'temperature' => 0.3,
        ]);

        return response()->json(['data' => ['reply' => trim($reply)]]);
    }
}
