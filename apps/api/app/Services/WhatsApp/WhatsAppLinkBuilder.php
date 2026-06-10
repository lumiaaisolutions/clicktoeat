<?php

namespace App\Services\WhatsApp;

use App\Models\Pedido;

/**
 * Genera la URL wa.me/<phone>?text=<encoded> a partir de un pedido.
 *
 * Esta clase es la fuente única de verdad para el formato del mensaje que
 * el cliente reenvía al WhatsApp del local. El frontend puede usar la misma
 * lógica (espejada en TypeScript) para previsualizar antes de enviar.
 */
class WhatsAppLinkBuilder
{
    public function buildForPedido(Pedido $pedido): string
    {
        // Local no usa BelongsToTenant (los locales SON el tenant), así que carga directo.
        $local = $pedido->local;

        $lines   = [];
        $lines[] = "Hola {$local->nombre}, quiero pedir:";
        $lines[] = '';

        foreach ($pedido->detalles as $d) {
            $lines[] = "• {$d->cantidad}× {$d->producto_nombre} — \${$d->subtotal}";

            foreach (($d->extras_seleccionados ?? []) as $extra) {
                $lines[] = "    ↳ {$extra['group']}: {$extra['item']}";
            }
        }

        $lines[] = '';
        $lines[] = "Subtotal: \${$pedido->subtotal}";

        if ((float) $pedido->delivery_fee > 0) {
            $lines[] = "Envío:    \${$pedido->delivery_fee}";
        }

        $lines[] = "Total:    \${$pedido->total}";
        $lines[] = '';
        $lines[] = "Nombre:    {$pedido->cliente_nombre}";
        $lines[] = "Teléfono:  {$pedido->cliente_telefono}";

        if ($pedido->metodo_entrega === 'delivery') {
            $lines[] = "Dirección: {$pedido->direccion}";
        } else {
            $lines[] = 'Entrega:   Recoger en sucursal';
        }

        $lines[] = "Pago:      ".$this->labelPago($pedido->metodo_pago);
        $lines[] = "Folio:     {$pedido->codigo}";

        $phone = preg_replace('/\D+/', '', $local->whatsapp);

        return sprintf(
            'https://wa.me/%s?text=%s',
            $phone,
            rawurlencode(implode("\n", $lines))
        );
    }

    protected function labelPago(string $metodo): string
    {
        return match ($metodo) {
            'efectivo'        => 'Efectivo',
            'tarjeta_entrega' => 'Tarjeta a la entrega',
            'transferencia'   => 'Transferencia',
            default           => $metodo,
        };
    }
}
