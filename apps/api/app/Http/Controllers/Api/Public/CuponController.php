<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Cupon;
use App\Models\Local;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Valida un código de cupón para un local público. NO autentica al usuario.
 * Devuelve el descuento aplicable sobre un subtotal dado.
 *
 * Rate-limited a 30/min por IP — antifraud básico.
 */
class CuponController extends Controller
{
    public function validar(Request $req, string $slug): JsonResponse
    {
        $data = $req->validate([
            'codigo'   => ['required', 'string', 'max:32'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $local = Local::where('slug', $slug)->where('activo', true)->first();
        if (! $local) {
            return response()->json(['valid' => false, 'message' => 'Local no encontrado.'], 404);
        }

        $cupon = Cupon::withoutGlobalScopes()
            ->where('local_id', $local->id)
            ->where('codigo', strtoupper(trim($data['codigo'])))
            ->first();

        if (! $cupon) {
            return response()->json(['valid' => false, 'message' => 'Cupón inválido.'], 200);
        }
        if (! $cupon->activo) {
            return response()->json(['valid' => false, 'message' => 'Este cupón ya no está activo.'], 200);
        }
        $hoy = now()->startOfDay();
        if ($cupon->fecha_desde && $cupon->fecha_desde->gt($hoy)) {
            return response()->json(['valid' => false, 'message' => 'Este cupón aún no es válido.'], 200);
        }
        if ($cupon->fecha_hasta && $cupon->fecha_hasta->lt($hoy)) {
            return response()->json(['valid' => false, 'message' => 'Este cupón ya expiró.'], 200);
        }
        if (! $cupon->tieneCupoDisponible()) {
            return response()->json(['valid' => false, 'message' => 'Este cupón ya alcanzó su límite de usos.'], 200);
        }
        // F100 — Validar horario programado
        if (! $cupon->aplicaEnEsteMomento()) {
            return response()->json(['valid' => false, 'message' => 'Este cupón solo aplica en su horario configurado.'], 200);
        }
        if ((float) $data['subtotal'] < (float) $cupon->min_subtotal) {
            return response()->json([
                'valid'   => false,
                'message' => "Tu pedido necesita ser de al menos \${$cupon->min_subtotal} MXN para usar este cupón.",
                'min_subtotal' => (float) $cupon->min_subtotal,
            ], 200);
        }

        $descuento = $cupon->calcularDescuento((float) $data['subtotal']);
        return response()->json([
            'valid'      => true,
            'codigo'     => $cupon->codigo,
            'tipo'       => $cupon->tipo,
            'valor'      => (float) $cupon->valor,
            'descuento'  => round($descuento, 2),
            'subtotal_con_descuento' => round((float) $data['subtotal'] - $descuento, 2),
            'message'    => $cupon->tipo === 'percent'
                ? "Aplicado: {$cupon->valor}% de descuento."
                : 'Descuento aplicado.',
        ]);
    }

    /**
     * F100 — Listado de cupones DESTACADOS activos para mostrar en la landing
     * como banner "Promo activa ahora". Filtra por horario en runtime.
     */
    public function destacados(string $slug): JsonResponse
    {
        $local = Local::where('slug', $slug)->where('activo', true)->first();
        if (! $local) return response()->json(['data' => []]);

        $items = Cupon::withoutGlobalScopes()
            ->where('local_id', $local->id)
            ->where('destacado_en_landing', true)
            ->vigente()
            ->get()
            ->filter(fn ($c) => $c->aplicaEnEsteMomento() && $c->tieneCupoDisponible())
            ->map(fn ($c) => [
                'id'                  => $c->id,
                'codigo'              => $c->codigo,
                'tipo'                => $c->tipo,
                'valor'               => (float) $c->valor,
                'min_subtotal'        => (float) $c->min_subtotal,
                'productos_sugeridos' => $c->productos_sugeridos ?? [],
                'hora_inicio'         => $c->hora_inicio,
                'hora_fin'            => $c->hora_fin,
                'descripcion_corta'   => $c->tipo === 'percent'
                    ? "{$c->valor}% OFF con {$c->codigo}"
                    : "\${$c->valor} OFF con {$c->codigo}",
            ])
            ->values();

        return response()->json(['data' => $items]);
    }
}
