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

        return (new MailMessage())
            ->subject('Restablecer contraseña — '.config('app.name'))
            ->greeting('Hola '.($notifiable->nombre ?? '').',')
            ->line('Recibimos una solicitud para restablecer tu contraseña en '.config('app.name').'.')
            ->action('Restablecer contraseña', $url)
            ->line('Este enlace expira en 60 minutos.')
            ->line('Si no solicitaste este cambio, ignora este mensaje — tu cuenta sigue segura.')
            ->salutation('— Equipo '.config('app.name'));
    }
}
