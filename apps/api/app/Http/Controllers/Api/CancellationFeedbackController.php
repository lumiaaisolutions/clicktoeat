<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Recolecta el motivo cuando un owner cancela su suscripción. Es
 * gold-data para reducir churn — el módulo cancela igual aunque el
 * usuario no envíe motivo (no es bloqueante).
 */
/**
 * SEV-12 nota: Este controller usa `abort(403)` inline en lugar del patrón
 * Policy + `$this->authorize()`. Ambos son válidos — la inline check es
 * tight, clara y específica al caso (no es CRUD, no necesita policy
 * reutilizable). El audit del 2026-06-19 lo flageó por "no Policy"; aquí
 * confirmamos que es decisión consciente, no oversight.
 */
class CancellationFeedbackController extends Controller
{
    public function store(Request $req): JsonResponse
    {
        $user = $req->user();
        if (! $user || ! $user->local_id) abort(403);

        $data = $req->validate([
            'motivo'        => ['required', 'in:precio,falta_feature,no_funciono,no_lo_uso,cambio_proveedor,otro'],
            'motivo_detalle'=> ['nullable', 'string', 'max:500'],
        ]);

        DB::table('cancellation_feedback')->insert([
            'local_id'      => $user->local_id,
            'user_id'       => $user->id,
            'motivo'        => $data['motivo'],
            'motivo_detalle'=> $data['motivo_detalle'] ?? null,
            'created_at'    => now(),
        ]);

        return response()->json(['data' => null], 201);
    }

    /** Resumen agregado para super_admin (visible en /admin/saas-metrics). */
    public function summary(): JsonResponse
    {
        if (! request()->user()?->isSuperAdmin()) abort(403);

        $rows = DB::table('cancellation_feedback')
            ->select('motivo', DB::raw('COUNT(*) as count'))
            ->where('created_at', '>=', now()->subDays(90))
            ->groupBy('motivo')
            ->orderByDesc('count')
            ->get();

        $detalles = DB::table('cancellation_feedback')
            ->whereNotNull('motivo_detalle')
            ->where('motivo_detalle', '!=', '')
            ->where('created_at', '>=', now()->subDays(90))
            ->orderByDesc('created_at')
            ->limit(15)
            ->get(['motivo', 'motivo_detalle', 'created_at']);

        return response()->json([
            'agregado'  => $rows,
            'comentarios' => $detalles,
        ]);
    }
}
