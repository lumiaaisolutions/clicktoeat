<?php

namespace App\Mail;

use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TrialWillEndMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Local $local) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu trial de ClickToEat termina pronto');
    }

    public function content(): Content
    {
        $days = $this->local->trial_ends_at?->diffInDays(now()) ?? 0;
        return new Content(
            view: 'emails.trial-will-end',
            with: [
                'local'    => $this->local,
                'daysLeft' => $days,
                'portal'   => config('stripe.portal_return_url'),
            ],
        );
    }
}
