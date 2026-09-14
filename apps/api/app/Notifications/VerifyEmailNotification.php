<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

/**
 * Verificación de correo (doble opt-in) con el diseño de ClickToEat.
 * Enlaza a la ruta firmada `verification.verify` del backend, que marca el
 * correo como verificado y redirige a una página de éxito del frontend.
 */
class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ],
        );

        return (new MailMessage)
            ->subject('Confirma tu correo — ClickToEat')
            ->view('mail.verify_email', [
                'nombre' => $notifiable->nombre ?? '',
                'url' => $url,
            ]);
    }
}
