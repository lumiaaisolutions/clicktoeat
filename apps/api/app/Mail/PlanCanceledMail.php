<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PlanCanceledMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(public Local $local) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->editableSubject('plan_canceled', 'Cancelaste tu suscripción de ClickToEat'));
    }

    public function content(): Content
    {
        return $this->editableContent('plan_canceled', 'emails.plan-canceled', [
            'local'   => $this->local,
            'endsAt'  => $this->local->current_period_ends_at,
        ]);
    }

    protected function templateVars(): array
    {
        return [
            'nombre_local' => $this->local->nombre,
            'fecha'        => $this->local->current_period_ends_at?->format('d/m/Y'),
        ];
    }
}
