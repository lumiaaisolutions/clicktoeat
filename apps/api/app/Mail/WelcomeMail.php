<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(
        public Local $local,
        public User $owner,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->editableSubject('welcome', '¡Bienvenido a ClickToEat!'));
    }

    public function content(): Content
    {
        $base = rtrim((string) (config('stripe.portal_return_url') ?: config('app.url')), '/');
        $base = preg_replace('#/admin/?.*$#', '', $base) ?: $base;

        return $this->editableContent('welcome', 'emails.welcome', [
            'local'    => $this->local,
            'owner'    => $this->owner,
            'panelUrl' => "{$base}/admin",
            'publicUrl' => "{$base}/{$this->local->slug}",
            'trialEnds' => $this->local->trial_ends_at,
        ]);
    }

    protected function templateVars(): array
    {
        $base = rtrim((string) (config('stripe.portal_return_url') ?: config('app.url')), '/');
        $base = preg_replace('#/admin/?.*$#', '', $base) ?: $base;
        return [
            'nombre_local'   => $this->local->nombre,
            'nombre_cliente' => $this->owner->nombre,
            'link'           => "{$base}/admin",
            'fecha'          => now()->format('d/m/Y H:i'),
        ];
    }
}
