<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $token) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // URL del frontend con el token + email para que el flujo termine
        // en la landing pública (no en el backend).
        $url = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').
            '/reset-password?token='.$this->token.'&email='.urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Restablecer contraseña — '.config('app.name'))
            ->view('mail.reset_password', [
                'nombre' => $notifiable->nombre ?? '',
                'url' => $url,
            ]);
    }
}
