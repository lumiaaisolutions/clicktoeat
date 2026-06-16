<?php

namespace App\Mail;

use App\Models\Local;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Local $local,
        public User $owner,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '¡Bienvenido a ClickToEat!');
    }

    public function content(): Content
    {
        $base = rtrim((string) (config('stripe.portal_return_url') ?: config('app.url')), '/');
        $base = preg_replace('#/admin/?.*$#', '', $base) ?: $base;

        return new Content(
            view: 'emails.welcome',
            with: [
                'local'    => $this->local,
                'owner'    => $this->owner,
                'panelUrl' => "{$base}/admin",
                'publicUrl' => "{$base}/{$this->local->slug}",
                'trialEnds' => $this->local->trial_ends_at,
            ],
        );
    }
}
