<?php

namespace App\Services\Notifications;

use App\Models\PushSubscription;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Envía notificaciones Web Push a todas las suscripciones de un local.
 *
 * - Si VAPID_* no está configurado, los métodos hacen no-op silencioso.
 * - Las subscripciones con status 404/410 se borran (browser revocó).
 */
class WebPushSender
{
    public function sendToLocal(int $localId, array $payload): void
    {
        $this->sendToSubs(PushSubscription::query()->where('local_id', $localId)->get(), $payload);
    }

    /** Envía a TODOS los super_admin suscritos. Útil para tickets, signups, etc. */
    public function sendToSuperAdmins(array $payload): void
    {
        $userIds = \App\Models\User::query()->where('rol', 'super_admin')->pluck('id');
        if ($userIds->isEmpty()) return;
        $this->sendToSubs(PushSubscription::query()->whereIn('user_id', $userIds)->get(), $payload);
    }

    /** Envía a un usuario específico (cualquier rol). */
    public function sendToUser(int $userId, array $payload): void
    {
        $this->sendToSubs(PushSubscription::query()->where('user_id', $userId)->get(), $payload);
    }

    private function sendToSubs($subs, array $payload): void
    {
        $webPush = $this->build();
        if (! $webPush) return;
        if ($subs->isEmpty()) return;

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

        foreach ($subs as $sub) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'publicKey'       => $sub->p256dh,
                    'authToken'       => $sub->auth,
                    'contentEncoding' => 'aesgcm',
                ]),
                $json,
            );
        }

        try {
            foreach ($webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                if (! $report->isSuccess()) {
                    $code = $report->getResponse()?->getStatusCode();
                    if (in_array($code, [404, 410], true)) {
                        PushSubscription::query()->where('endpoint', $endpoint)->delete();
                    }
                }
            }
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function build(): ?WebPush
    {
        $public  = (string) config('services.webpush.public_key', env('VAPID_PUBLIC_KEY'));
        $private = (string) config('services.webpush.private_key', env('VAPID_PRIVATE_KEY'));
        $subject = (string) config('services.webpush.subject', env('VAPID_SUBJECT', 'mailto:soporte@lumiaaisolutions.com'));

        if (! $public || ! $private) return null;

        return new WebPush([
            'VAPID' => [
                'subject'    => $subject,
                'publicKey'  => $public,
                'privateKey' => $private,
            ],
        ], [], 5);
    }
}
