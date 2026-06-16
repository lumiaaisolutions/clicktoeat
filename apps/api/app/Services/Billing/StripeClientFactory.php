<?php

namespace App\Services\Billing;

use RuntimeException;
use Stripe\StripeClient;

/**
 * Singleton del StripeClient. Lazy-init para que dev sin keys no se rompa
 * importando este archivo — solo si alguien llama a `make()` truena.
 *
 * Registrado en `AppServiceProvider` como singleton para reuso.
 */
class StripeClientFactory
{
    private ?StripeClient $client = null;

    public function make(): StripeClient
    {
        if ($this->client !== null) {
            return $this->client;
        }

        $secret = config('stripe.secret_key');
        if (empty($secret)) {
            throw new RuntimeException(
                'STRIPE_SECRET_KEY no está configurado. Agrega tu clave a apps/api/.env.',
            );
        }

        $this->client = new StripeClient([
            'api_key'        => $secret,
            'stripe_version' => '2024-06-20',
        ]);

        return $this->client;
    }
}
