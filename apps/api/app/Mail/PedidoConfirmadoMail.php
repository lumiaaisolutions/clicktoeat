<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoConfirmadoMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(public Pedido $pedido) {}

    public function envelope(): Envelope
    {
        $local = $this->pedido->local;
        return new Envelope(
            subject: $this->editableSubject(
                'pedido_confirmado',
                "Recibimos tu pedido {$this->pedido->codigo} · {$local->nombre}",
            ),
            replyTo: $local->email_contacto ? [$local->email_contacto] : [],
        );
    }

    public function content(): Content
    {
        return $this->editableContent('pedido_confirmado', 'mail.pedido_confirmado', [
            'pedido' => $this->pedido,
            'local'  => $this->pedido->local,
        ]);
    }

    protected function templateVars(): array
    {
        $local = $this->pedido->local;
        return [
            'nombre_local'   => $local->nombre,
            'nombre_cliente' => $this->pedido->cliente_nombre ?? '',
            'pedido_id'      => $this->pedido->codigo ?? $this->pedido->id,
            'total'          => '$'.number_format((float) $this->pedido->total, 2),
            'fecha'          => $this->pedido->created_at?->format('d/m/Y H:i'),
        ];
    }
}
