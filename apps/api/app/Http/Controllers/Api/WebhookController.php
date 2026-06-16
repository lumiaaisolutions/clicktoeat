<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionEvent;
use App\Services\Billing\WebhookHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook as StripeWebhook;
use Throwable;

/**
 * Recepción de webhooks de Stripe.
 *
 * Verifica firma con `STRIPE_WEBHOOK_SECRET`. Aplica idempotencia por
 * `stripe_event_id` (UNIQUE en `subscription_events`). Si el handler
 * falla, devuelve 500 — Stripe reintenta con backoff exponencial.
 *
 * Eventos manejados en `App\Services\Billing\WebhookHandler`.
 */
class WebhookController extends Controller
{
    public function __construct(
        private readonly WebhookHandler $handler,
    ) {}

    public function stripe(Request $req): Response
    {
        $payload = $req->getContent();
        $sig     = $req->header('Stripe-Signature');
        $secret  = config('stripe.webhook_secret');

        if (empty($secret)) {
            Log::error('Stripe webhook recibido pero STRIPE_WEBHOOK_SECRET no está configurado.');
            return response('Webhook secret not configured', 500);
        }

        try {
            $event = StripeWebhook::constructEvent($payload, $sig ?? '', $secret);
        } catch (SignatureVerificationException $e) {
            Log::warning('Webhook Stripe: firma inválida.', ['error' => $e->getMessage()]);
            return response('Invalid signature', 400);
        } catch (Throwable $e) {
            Log::error('Webhook Stripe: error al construir evento.', ['error' => $e->getMessage()]);
            return response('Bad payload', 400);
        }

        // Idempotencia: si ya lo procesamos, devolvemos 200 sin reprocesar.
        $existing = SubscriptionEvent::where('stripe_event_id', $event->id)->first();
        if ($existing && $existing->processed_at !== null) {
            return response('Already processed', 200);
        }

        $record = $existing ?? SubscriptionEvent::create([
            'stripe_event_id' => $event->id,
            'type'            => $event->type,
            'payload'         => $event->toArray(),
        ]);

        try {
            $this->handler->handle($event, $record);
            $record->update(['processed_at' => now(), 'error' => null]);
            return response('OK', 200);
        } catch (Throwable $e) {
            Log::error('Webhook Stripe: handler falló.', [
                'event_id' => $event->id,
                'type'     => $event->type,
                'error'    => $e->getMessage(),
            ]);
            $record->update(['error' => mb_substr($e->getMessage(), 0, 2000)]);
            // 500 → Stripe reintenta automáticamente (hasta 3 días)
            return response('Handler failed: '.$e->getMessage(), 500);
        }
    }
}
