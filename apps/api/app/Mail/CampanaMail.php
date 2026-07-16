<?php

namespace App\Mail;

use App\Models\Campana;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Contenido libre por campaña (no usa el sistema de plantillas editables
 * F98 — ese es para transaccionales fijos; una campaña de marketing cambia
 * de asunto/mensaje en cada envío).
 */
class CampanaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Campana $campana) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->campana->asunto ?: $this->campana->nombre,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.campana',
            with: [
                'local' => $this->campana->local,
                'mensaje' => $this->campana->mensaje,
            ],
        );
    }
}
