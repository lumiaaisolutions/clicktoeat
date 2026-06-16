<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Health endpoint extendido. Verifica componentes individuales para que
 * uptimerobot / cualquier monitor pueda alertar específicamente.
 *
 * Responde 200 si todos los checks pasaron, 503 si alguno falla — así un
 * monitor externo que mire status code detecta degradación.
 */
class HealthController extends Controller
{
    public function deep(): JsonResponse
    {
        $checks = [];
        $start  = microtime(true);

        // DB ping — query barata
        $checks['database'] = $this->check(function () {
            DB::selectOne('select 1 as ok');
            return ['driver' => DB::connection()->getDriverName()];
        });

        // Cache write/read
        $checks['cache'] = $this->check(function () {
            $k = 'health:'.bin2hex(random_bytes(4));
            Cache::put($k, '1', 30);
            $v = Cache::pull($k);
            if ($v !== '1') throw new \RuntimeException('cache mismatch');
            return ['driver' => config('cache.default')];
        });

        // Storage write
        $checks['storage'] = $this->check(function () {
            $name = 'health/'.bin2hex(random_bytes(4)).'.txt';
            Storage::disk('local')->put($name, 'ok');
            $exists = Storage::disk('local')->exists($name);
            Storage::disk('local')->delete($name);
            if (! $exists) throw new \RuntimeException('storage write failed');
            return ['disk' => 'local'];
        });

        // Stripe — opcional, sólo si SK está configurado
        if (config('stripe.secret_key') || env('STRIPE_SECRET')) {
            $checks['stripe'] = $this->check(function () {
                $client = new \Stripe\StripeClient((string) (config('stripe.secret_key') ?: env('STRIPE_SECRET')));
                // Account retrieve es la query más barata
                $client->accounts->retrieve();
                return ['mode' => str_starts_with((string) env('STRIPE_SECRET'), 'sk_live_') ? 'live' : 'test'];
            });
        }

        $ok = collect($checks)->every(fn ($c) => $c['status'] === 'ok');

        return response()->json([
            'status'        => $ok ? 'ok' : 'degraded',
            'app'           => config('app.name'),
            'env'           => config('app.env'),
            'version'       => trim((string) @file_get_contents(base_path('VERSION'))) ?: 'dev',
            'checks'        => $checks,
            'response_ms'   => round((microtime(true) - $start) * 1000, 1),
            'timestamp'     => now()->toIso8601String(),
        ], $ok ? 200 : 503);
    }

    private function check(callable $fn): array
    {
        $t0 = microtime(true);
        try {
            $detail = $fn() ?? [];
            return [
                'status'  => 'ok',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 1),
                ...$detail,
            ];
        } catch (Throwable $e) {
            return [
                'status'  => 'error',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 1),
                'error'   => $e->getMessage(),
            ];
        }
    }
}
