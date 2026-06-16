<?php

namespace App\Mail;

use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentFailedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Local $local) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu pago de ClickToEat falló');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-failed',
            with: [
                'local'  => $this->local,
                'portal' => config('stripe.portal_return_url'),
            ],
        );
    }
}
