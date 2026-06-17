<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\Plan;
use App\Models\Referral;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;

/**
 * Endpoint del programa de referidos. Devuelve el código del local
 * + share URL + lista de referidos hechos por este local + estimación
 * del descuento ganado (10% × precio del plan × N rewarded).
 */
class ReferidoController extends Controller
{
    public function index(TenantContext $ctx): JsonResponse
    {
        $local = $ctx->local();
        if (! $local) return response()->json(['message' => 'Sin tenant'], 403);

        // F100 auto-heal: locales legacy creados antes del booted callback de
        // F36 podían quedarse sin código. Lo generamos ahora si falta.
        if (empty($local->codigo_referido)) {
            for ($i = 0; $i < 20; $i++) {
                $candidate = strtoupper(\Illuminate\Support\Str::random(8));
                if (! \App\Models\Local::query()->withoutGlobalScopes()->where('codigo_referido', $candidate)->exists()) {
                    $local->forceFill(['codigo_referido' => $candidate])->save();
                    break;
                }
            }
            if (empty($local->codigo_referido)) {
                $local->forceFill(['codigo_referido' => 'REF-'.strtoupper(\Illuminate\Support\Str::random(8))])->save();
            }
        }

        $codigo = $local->codigo_referido;
        $frontend = rtrim((string) (env('APP_URL_FRONTEND', 'http://localhost:3000')), '/');
        $shareUrl = $codigo ? "{$frontend}/?ref={$codigo}" : null;

        $refs = Referral::query()
            ->with(['referred:id,nombre,slug,plan_id,plan_status'])
            ->where('referrer_local_id', $local->id)
            ->orderByDesc('created_at')
            ->get(['id', 'referred_local_id', 'status', 'rewarded_at', 'stripe_coupon_id', 'created_at']);

        $rewarded = $refs->where('status', 'rewarded')->count();

        // Estimación: 10% del plan del referrer por cada rewarded
        $planCentavos = $local->plan?->precio_mxn_centavos ?? 0;
        $ahorroEstimado = round(($planCentavos / 100) * 0.10 * $rewarded, 2);

        return response()->json([
            'codigo'   => $codigo,
            'share_url' => $shareUrl,
            'mensaje_whatsapp' => $codigo
                ? "Te recomiendo ClickToEat para tu local. Es muy fácil: tu menú online + pedidos por WhatsApp, sin comisiones. Usa mi código *{$codigo}* al registrarte y los dos ganamos. {$shareUrl}"
                : null,
            'stats' => [
                'total'    => $refs->count(),
                'pending'  => $refs->where('status', 'pending')->count(),
                'rewarded' => $rewarded,
                'ahorro_estimado_mxn' => $ahorroEstimado,
            ],
            'data' => $refs->map(fn ($r) => [
                'id'          => $r->id,
                'local_nombre' => $r->referred?->nombre ?? 'Local',
                'local_slug'   => $r->referred?->slug,
                'status'      => $r->status,
                'rewarded_at' => $r->rewarded_at?->toIso8601String(),
                'created_at'  => $r->created_at?->toIso8601String(),
            ]),
        ]);
    }
}
