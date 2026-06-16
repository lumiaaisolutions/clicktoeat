<?php

namespace App\Mail;

use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CarritoAbandonadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Local $local,
        public string $clienteNombre,
        public array  $items,
        public float  $totalEstimado,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🛒 Te quedó algo pendiente en {$this->local->nombre}",
            replyTo: $this->local->email_contacto ? [$this->local->email_contacto] : [],
        );
    }

    public function content(): Content
    {
        $landing = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/').'/'.$this->local->slug;
        return new Content(
            view: 'mail.carrito_abandonado',
            with: [
                'local' => $this->local,
                'clienteNombre' => $this->clienteNombre,
                'items' => $this->items,
                'totalEstimado' => $this->totalEstimado,
                'landingUrl'    => $landing,
            ],
        );
    }
}
