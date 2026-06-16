<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoConfirmadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido) {}

    public function envelope(): Envelope
    {
        $local = $this->pedido->local;
        return new Envelope(
            subject: "Recibimos tu pedido {$this->pedido->codigo} · {$local->nombre}",
            replyTo: $local->email_contacto ? [$local->email_contacto] : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.pedido_confirmado',
            with: [
                'pedido' => $this->pedido,
                'local'  => $this->pedido->local,
            ],
        );
    }
}
