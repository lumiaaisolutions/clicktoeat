<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Seguimiento del pedido al cliente: cada cambio de estado relevante manda un
 * correo con copy consciente del modo de entrega (recoger vs a domicilio).
 * Solo para pedidos del landing (ver PedidoController::updateEstado).
 */
class PedidoEstadoMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido) {}

    /** Estados que ameritan avisar al cliente. */
    public const NOTIFICABLES = ['confirmado', 'listo', 'en_camino', 'entregado'];

    public function envelope(): Envelope
    {
        $local = $this->pedido->local;
        $copy = $this->copy();

        return new Envelope(
            subject: "{$copy['titulo']} · {$this->pedido->codigo}",
            replyTo: $local->email_contacto ? [$local->email_contacto] : [],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.pedido_estado', with: [
            'pedido' => $this->pedido,
            'local' => $this->pedido->local,
            'copy' => $this->copy(),
        ]);
    }

    /** Copy consciente de estado + modo de entrega. */
    public function copy(): array
    {
        $estado = $this->pedido->estado;
        $esDomicilio = $this->pedido->metodo_entrega === 'delivery';

        return match ($estado) {
            'confirmado' => [
                'kicker' => 'Pedido confirmado',
                'titulo' => '¡Confirmamos tu pedido!',
                'mensaje' => 'Ya lo tenemos y empezamos a prepararlo. Te avisamos en cuanto esté.',
                'color' => '#2F9E67',
            ],
            'listo' => $esDomicilio ? [
                'kicker' => 'Pedido listo',
                'titulo' => 'Tu pedido está listo',
                'mensaje' => 'Lo tenemos listo y sale en camino a tu dirección en breve.',
                'color' => '#F26A1F',
            ] : [
                'kicker' => 'Listo para recoger',
                'titulo' => '¡Tu pedido está listo para recoger!',
                'mensaje' => 'Pásalo a recoger cuando gustes. Te esperamos.',
                'color' => '#F26A1F',
            ],
            'en_camino' => [
                'kicker' => 'En camino',
                'titulo' => 'Tu pedido va en camino',
                'mensaje' => 'Nuestro repartidor va hacia tu dirección. Llega en unos minutos.',
                'color' => '#5B8DEF',
            ],
            'entregado' => [
                'kicker' => 'Entregado',
                'titulo' => '¡Que lo disfrutes!',
                'mensaje' => 'Tu pedido fue entregado. Gracias por tu compra — nos encantaría saber qué te pareció.',
                'color' => '#2F9E67',
            ],
            default => [
                'kicker' => 'Actualización de tu pedido',
                'titulo' => 'Tu pedido cambió de estado',
                'mensaje' => 'Hay una novedad con tu pedido.',
                'color' => '#F26A1F',
            ],
        };
    }
}
