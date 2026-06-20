<?php

namespace App\Services\Notifications;

use App\Models\MobileDevice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Envía notificaciones push a la app móvil vía Expo Push Service.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * - Sin tokens registrados → no-op silencioso.
 * - Tokens reportados como DeviceNotRegistered / InvalidCredentials se borran.
 * - Batches de 100 por POST (limite de Expo).
 */
class ExpoPushSender
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';
    private const BATCH    = 100;

    public function sendToLocal(int $localId, array $payload): void
    {
        $devices = MobileDevice::query()->where('local_id', $localId)->get();
        $this->send($devices, $payload);
    }

    public function sendToUser(int $userId, array $payload): void
    {
        $devices = MobileDevice::query()->where('user_id', $userId)->get();
        $this->send($devices, $payload);
    }

    /** @param \Illuminate\Database\Eloquent\Collection<int, MobileDevice> $devices */
    private function send($devices, array $payload): void
    {
        if ($devices->isEmpty()) return;

        $title = (string) ($payload['title'] ?? 'ClickToEat');
        $body  = (string) ($payload['body']  ?? '');
        $data  = $payload['data'] ?? [];

        foreach ($devices->chunk(self::BATCH) as $chunk) {
            $messages = $chunk->map(function (MobileDevice $d) use ($title, $body, $data) {
                return [
                    'to'        => $d->expo_push_token,
                    'title'     => $title,
                    'body'      => $body,
                    'sound'     => 'default',
                    'data'      => $data,
                    'channelId' => 'pedidos',
                    'priority'  => 'high',
                ];
            })->values()->toArray();

            try {
                $res = Http::timeout(10)
                    ->withHeaders([
                        'Accept'           => 'application/json',
                        'Accept-Encoding'  => 'gzip, deflate',
                        'Content-Type'     => 'application/json',
                    ])
                    ->post(self::ENDPOINT, $messages);

                $this->handleResponse($res->json('data') ?? [], $chunk);
            } catch (Throwable $e) {
                Log::warning('ExpoPushSender error', ['msg' => $e->getMessage()]);
            }
        }
    }

    /**
     * @param array<int, array{status?: string, message?: string, details?: array{error?: string}}> $tickets
     * @param \Illuminate\Database\Eloquent\Collection<int, MobileDevice>                            $chunk
     */
    private function handleResponse(array $tickets, $chunk): void
    {
        $devices = $chunk->values();
        foreach ($tickets as $i => $ticket) {
            if (($ticket['status'] ?? '') === 'error') {
                $errorCode = $ticket['details']['error'] ?? '';
                if (in_array($errorCode, ['DeviceNotRegistered', 'InvalidCredentials'], true)) {
                    $devices[$i]?->delete();
                }
            }
        }
    }
}
