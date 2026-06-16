<?php

namespace App\Mail;

use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PlanCanceledMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Local $local) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Cancelaste tu suscripción de ClickToEat');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.plan-canceled',
            with: [
                'local'   => $this->local,
                'endsAt'  => $this->local->current_period_ends_at,
            ],
        );
    }
}
