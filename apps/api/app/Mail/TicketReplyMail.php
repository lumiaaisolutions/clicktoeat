<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TicketReplyMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(public SupportTicket $ticket, public string $mensaje) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->editableSubject(
                'ticket_reply',
                "Respuesta a tu ticket #{$this->ticket->id} · ClickToEat",
            ),
        );
    }

    public function content(): Content
    {
        return $this->editableContent('ticket_reply', 'mail.ticket_reply', [
            'ticket'  => $this->ticket,
            'mensaje' => $this->mensaje,
        ]);
    }

    protected function templateVars(): array
    {
        return [
            'nombre_cliente' => $this->ticket->user?->nombre ?? '',
            'pedido_id'      => $this->ticket->id,
            'fecha'          => now()->format('d/m/Y H:i'),
        ];
    }
}
