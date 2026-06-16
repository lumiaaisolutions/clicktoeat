<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentFailedMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(public Local $local) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->editableSubject('payment_failed', 'Tu pago de ClickToEat falló'));
    }

    public function content(): Content
    {
        return $this->editableContent('payment_failed', 'emails.payment-failed', [
            'local'  => $this->local,
            'portal' => config('stripe.portal_return_url'),
        ]);
    }

    protected function templateVars(): array
    {
        return [
            'nombre_local' => $this->local->nombre,
            'link'         => (string) config('stripe.portal_return_url'),
            'fecha'        => now()->format('d/m/Y'),
        ];
    }
}
