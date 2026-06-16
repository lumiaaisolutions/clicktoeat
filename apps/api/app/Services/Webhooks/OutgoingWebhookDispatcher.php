<?php

namespace App\Services\Webhooks;

use App\Models\OutgoingWebhook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Despacha eventos a las URLs configuradas por cada local.
 *
 * Firma cada request con HMAC-SHA256 del body usando el secret del webhook
 * y lo envía como header `X-CTE-Signature: sha256=<hex>`. El cliente debe
 * verificar esa firma antes de procesar.
 *
 * Tolerancia: timeout 5s, sin retries (si falla incrementamos error_count y
 * registramos el error). Si error_count llega a 10 desactivamos el webhook
 * para no spamear endpoints muertos.
 *
 * Llamado inline desde OrderService (no usa queue para evitar dependencias
 * en Hostinger sin worker). Para volúmenes altos, mover a job async.
 */
class OutgoingWebhookDispatcher
{
    public static function dispatch(int $localId, string $event, array $payload): void
    {
        $hooks = OutgoingWebhook::query()
            ->where('local_id', $localId)
            ->where('event', $event)
            ->where('active', true)
            ->where('error_count', '<', 10)
            ->get();

        if ($hooks->isEmpty()) return;

        $body = json_encode([
            'event'      => $event,
            'local_id'   => $localId,
            'timestamp'  => now()->toIso8601String(),
            'data'       => $payload,
        ], JSON_UNESCAPED_UNICODE);

        foreach ($hooks as $h) {
            $sig = hash_hmac('sha256', $body, (string) $h->secret);
            try {
                $res = Http::withHeaders([
                    'Content-Type'      => 'application/json',
                    'X-CTE-Event'       => $event,
                    'X-CTE-Signature'   => 'sha256='.$sig,
                    'User-Agent'        => 'ClickToEat-Webhook/1.0',
                ])->timeout(5)->send('POST', $h->url, ['body' => $body]);

                $h->update([
                    'last_called_at' => now(),
                    'last_status'    => $res->status(),
                    'last_error'     => $res->successful() ? null : substr($res->body(), 0, 500),
                    'error_count'    => $res->successful() ? 0 : $h->error_count + 1,
                ]);
            } catch (Throwable $e) {
                $h->update([
                    'last_called_at' => now(),
                    'last_status'    => null,
                    'last_error'     => substr($e->getMessage(), 0, 500),
                    'error_count'    => $h->error_count + 1,
                ]);
                Log::warning('outgoing-webhook failed', ['id' => $h->id, 'error' => $e->getMessage()]);
            }
        }
    }
}
