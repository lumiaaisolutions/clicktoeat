<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garantiza idempotencia para requests POST que el cliente puede reintentar.
 *
 * Uso:
 *   Route::middleware('idempotent:24h')->post('/public/pedidos/{slug}', ...);
 *
 * El cliente debe mandar header `Idempotency-Key: <uuid v4>`. Si el header
 * NO viene → el middleware se salta (no es obligatorio para clientes legacy).
 *
 * Tres casos:
 *  - Key + hash match → devuelve respuesta cacheada (HTTP 200/201/etc original).
 *  - Key existe pero hash distinto → 409 (mal uso del cliente).
 *  - Key no existe → procesa, cachea respuesta antes de retornar al cliente.
 */
class Idempotency
{
    public function handle(Request $request, Closure $next, string $ttl = '24h'): Response
    {
        $key = $request->header('Idempotency-Key');

        // Si no viene el header → comportamiento legacy (sin idempotencia)
        if (! $key) {
            return $next($request);
        }

        // Sanity check del key: UUID-like, 8-80 chars, alfanumérico + guiones
        if (! preg_match('/^[a-zA-Z0-9\-_]{8,80}$/', $key)) {
            return response()->json([
                'message' => 'Idempotency-Key inválido. Usar UUID v4 (8-80 chars alfanuméricos).',
            ], 400);
        }

        $endpoint     = $request->method().':'.$request->path();
        $requestHash  = hash('sha256', json_encode($request->all()));

        // Buscar key existente
        $existing = DB::table('idempotency_keys')
            ->where('key', $key)
            ->where('endpoint', $endpoint)
            ->where('expires_at', '>', now())
            ->first();

        if ($existing) {
            // Mismo hash → respuesta cacheada
            if ($existing->request_hash === $requestHash) {
                return response(
                    json_decode($existing->response_body, true),
                    $existing->status_code,
                )->header('Idempotency-Replayed', 'true');
            }

            // Mismo key pero body distinto → mal uso
            return response()->json([
                'message' => 'Idempotency-Key reusada con body distinto. Usar key nueva.',
            ], 409);
        }

        // Procesar normal
        $response = $next($request);

        // Cachear sólo si fue success (2xx) — evita cachear errores transitorios
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $expiresAt = now()->add($this->parseTtl($ttl));

            DB::table('idempotency_keys')->insert([
                'key'           => $key,
                'endpoint'      => $endpoint,
                'request_hash'  => $requestHash,
                'status_code'   => $response->getStatusCode(),
                'response_body' => $response->getContent(),
                'created_at'    => now(),
                'expires_at'    => $expiresAt,
            ]);
        }

        return $response;
    }

    protected function parseTtl(string $ttl): \DateInterval
    {
        // Soporta "24h", "30m", "7d"
        if (preg_match('/^(\d+)([hmd])$/', $ttl, $m)) {
            $n = (int) $m[1];
            return match ($m[2]) {
                'm' => new \DateInterval("PT{$n}M"),
                'h' => new \DateInterval("PT{$n}H"),
                'd' => new \DateInterval("P{$n}D"),
            };
        }
        return new \DateInterval('PT24H');
    }
}
