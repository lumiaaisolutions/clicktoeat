<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TrialWillEndMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(public Local $local) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->editableSubject('trial_will_end', 'Tu prueba de ClickToEat termina pronto'));
    }

    public function content(): Content
    {
        $days = $this->local->trial_ends_at?->diffInDays(now()) ?? 0;
        return $this->editableContent('trial_will_end', 'emails.trial-will-end', [
            'local'    => $this->local,
            'daysLeft' => $days,
            'portal'   => config('stripe.portal_return_url'),
        ]);
    }

    protected function templateVars(): array
    {
        return [
            'nombre_local' => $this->local->nombre,
            'fecha'        => $this->local->trial_ends_at?->format('d/m/Y'),
            'link'         => (string) config('stripe.portal_return_url'),
        ];
    }
}
