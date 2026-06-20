<?php

namespace App\Services\Notifications;

/**
 * Fan-out a Web Push (browser) y Expo Push (app móvil) en una sola llamada.
 *
 * Uso:
 *   app(PushDispatcher::class)->sendToLocal($localId, [
 *       'title' => 'Pedido nuevo',
 *       'body'  => 'Mesa 5 — $250',
 *       'data'  => ['pedido_id' => $id, 'codigo' => $codigo],
 *   ]);
 */
class PushDispatcher
{
    public function __construct(
        private readonly WebPushSender $web,
        private readonly ExpoPushSender $mobile,
    ) {}

    public function sendToLocal(int $localId, array $payload): void
    {
        $this->web->sendToLocal($localId, $payload);
        $this->mobile->sendToLocal($localId, $payload);
    }

    public function sendToUser(int $userId, array $payload): void
    {
        $this->web->sendToUser($userId, $payload);
        $this->mobile->sendToUser($userId, $payload);
    }

    public function sendToSuperAdmins(array $payload): void
    {
        // Mobile no tiene concepto de super_admin enrolado todavía — sólo web.
        $this->web->sendToSuperAdmins($payload);
    }
}
