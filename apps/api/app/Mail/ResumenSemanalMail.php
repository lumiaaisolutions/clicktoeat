<?php

namespace App\Mail;

use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResumenSemanalMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Local $local,
        public array $stats, // ['pedidos', 'ventas', 'ticket', 'top', 'pedidos_prev', 'ventas_prev']
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "📊 Tu semana en {$this->local->nombre}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.resumen_semanal',
            with: [
                'local' => $this->local,
                'stats' => $this->stats,
                'panelUrl' => rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/').'/admin/metricas',
            ],
        );
    }
}
