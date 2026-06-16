<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Local;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Trackea carritos donde el cliente ya escribió email pero todavía no
 * envió el pedido. El frontend hace ping debounced (cada 30s o al cerrar tab).
 *
 * Si 60min después no se creó un pedido del mismo email + local,
 * el cron envía un email recordatorio (TrialNudgeMail-style, F75).
 */
class CarritoAbandonadoController extends Controller
{
    public function track(Request $req, string $slug): JsonResponse
    {
        $data = $req->validate([
            'email'          => ['required', 'email:rfc', 'max:191'],
            'cliente_nombre' => ['nullable', 'string', 'max:120'],
            'items'          => ['required', 'array', 'min:1', 'max:50'],
            'items.*.producto_id' => ['required', 'integer'],
            'items.*.nombre'      => ['required', 'string', 'max:120'],
            'items.*.cantidad'    => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.precio'      => ['required', 'numeric', 'min:0'],
            'total_estimado'      => ['nullable', 'numeric', 'min:0'],
        ]);

        $local = Local::where('slug', $slug)->where('activo', true)->firstOrFail();
        $email = strtolower(trim($data['email']));

        DB::table('carritos_abandonados')->updateOrInsert(
            ['local_id' => $local->id, 'email' => $email],
            [
                'cliente_nombre' => $data['cliente_nombre'] ?? null,
                'items'          => json_encode($data['items']),
                'total_estimado' => $data['total_estimado'] ?? 0,
                'seen_at'        => now(),
                'recovered_at'   => null, // reset si vuelve después de recuperar
                'notified_at'    => null,
                'updated_at'     => now(),
                'created_at'     => now(),
            ],
        );

        return response()->json(['data' => null], 202);
    }
}
