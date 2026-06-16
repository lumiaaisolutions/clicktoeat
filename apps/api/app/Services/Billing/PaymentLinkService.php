<?php

namespace App\Services\Billing;

use App\Models\Pedido;
use App\Models\Local;
use RuntimeException;
use Throwable;

/**
 * Genera Stripe Payment Links para que el cliente final pague su pedido
 * por adelantado (antes de mandar el WhatsApp).
 *
 * **Importante**: este servicio cobra al cliente final del local, NO al
 * owner del SaaS. Para que el dinero llegue al owner se requiere
 * **Stripe Connect** (`Local::stripe_account_id`). Si el owner no tiene
 * cuenta Connect, el cobro queda en la cuenta plataforma — útil para
 * pruebas pero no para producción multi-tenant.
 *
 * Stripe Payment Links son una alternativa más simple que Checkout Sessions:
 *  - No requieren cliente identificado
 *  - URL es shareable (la podemos mandar por WhatsApp también)
 *  - Soportan apple pay / google pay automáticamente
 *  - El webhook checkout.session.completed sigue funcionando
 */
class PaymentLinkService
{
    public function __construct(
        private readonly StripeClientFactory $stripeFactory,
    ) {}

    /**
     * Crea un Payment Link único para un pedido. Marca el pedido con el
     * link_id para que el webhook posterior pueda mapearlo.
     *
     * Lanza RuntimeException si Stripe no está disponible o si el owner
     * no aceptó pagos en línea.
     */
    public function crearParaPedido(Pedido $pedido, Local $local): string
    {
        if (! $local->acepta_pago_online) {
            throw new RuntimeException('Este local no acepta pago en línea.');
        }
        if (empty(config('stripe.secret_key'))) {
            throw new RuntimeException('STRIPE_SECRET_KEY no configurado.');
        }

        // Calcula total en centavos (Stripe usa la unidad mínima de la moneda)
        $totalCentavos = (int) round(((float) $pedido->total) * 100);
        if ($totalCentavos < 1000) {  // mín ~$10 MXN
            throw new RuntimeException('El total del pedido es muy bajo para procesarse.');
        }

        $opts = [];
        if (! empty($local->stripe_account_id)) {
            $opts['stripe_account'] = $local->stripe_account_id;
        }

        $stripe = $this->stripeFactory->make();

        try {
            // 1) Producto efímero (un line item por pedido — más simple que
            //    catálogo de productos en Stripe)
            $product = $stripe->products->create([
                'name' => "Pedido {$pedido->codigo} — {$local->nombre}",
                'metadata' => [
                    'pedido_codigo' => $pedido->codigo,
                    'local_slug'    => $local->slug,
                ],
            ], $opts);

            // 2) Precio fijo en MXN
            $price = $stripe->prices->create([
                'product'     => $product->id,
                'currency'    => 'mxn',
                'unit_amount' => $totalCentavos,
            ], $opts);

            // 3) Payment Link
            $link = $stripe->paymentLinks->create([
                'line_items' => [[
                    'price'    => $price->id,
                    'quantity' => 1,
                ]],
                'after_completion' => [
                    'type'     => 'redirect',
                    'redirect' => [
                        'url' => rtrim((string) config('app.url_frontend', config('app.url')), '/')."/{$local->slug}/pedido/{$pedido->codigo}?paid=1",
                    ],
                ],
                'metadata' => [
                    'pedido_codigo' => $pedido->codigo,
                    'local_slug'    => $local->slug,
                    'tipo'          => 'pedido_anticipado',
                ],
            ], $opts);

            $pedido->update(['stripe_payment_link_id' => $link->id]);
            return $link->url;

        } catch (Throwable $e) {
            throw new RuntimeException("No se pudo generar el link de pago: {$e->getMessage()}", 0, $e);
        }
    }
}
