<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reviews / calificaciones públicas del cliente final tras un pedido.
 *
 * Flow:
 *  1. Owner confirma pedido entregado → sistema genera `Review` con token
 *     + manda WhatsApp con link `tu-landing.com/{slug}/review/{token}`.
 *  2. Cliente entra al link → GET `/public/reviews/{token}` valida token.
 *  3. Cliente envía rating + comentario → POST `/public/reviews/{token}`.
 *  4. Reviews aprobados se muestran en landing pública del local.
 *
 * El owner puede des-aprobar reviews ofensivos desde su panel
 * `/admin/reviews` (futuro).
 */
class ReviewController extends Controller
{
    /** Listado público de reviews aprobados de un local (para la landing). */
    public function indexForLocal(string $slug): JsonResponse
    {
        $local = Local::query()->withoutGlobalScopes()->where('slug', $slug)->firstOrFail();

        $items = Review::query()->withoutGlobalScopes()
            ->where('local_id', $local->id)
            ->where('aprobado', true)
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'cliente_nombre', 'rating', 'comentario', 'created_at']);

        $avg   = $items->isEmpty() ? null : round($items->avg('rating'), 1);
        $total = $items->count();

        return response()->json([
            'data'    => $items,
            'average' => $avg,
            'total'   => $total,
        ]);
    }

    /** GET review por token — valida si todavía se puede enviar. */
    public function showByToken(string $token): JsonResponse
    {
        $review = Review::query()->withoutGlobalScopes()
            ->where('token', $token)
            ->with('local:id,nombre,slug')
            ->firstOrFail();

        if ($review->rating > 0) {
            return response()->json([
                'data' => $review,
                'already_submitted' => true,
            ]);
        }

        return response()->json([
            'local' => $review->local,
            'already_submitted' => false,
        ]);
    }

    /** POST review por token — el cliente envía su rating + comentario. */
    public function submitByToken(Request $req, string $token): JsonResponse
    {
        $data = $req->validate([
            'rating'     => ['required', 'integer', 'min:1', 'max:5'],
            'comentario' => ['nullable', 'string', 'max:1000'],
        ]);

        $review = Review::query()->withoutGlobalScopes()
            ->where('token', $token)
            ->firstOrFail();

        if ($review->rating > 0) {
            return response()->json([
                'message' => 'Esta calificación ya fue enviada.',
            ], 409);
        }

        $review->update([
            'rating'     => $data['rating'],
            'comentario' => $data['comentario'] ?? null,
            'aprobado'   => true,
        ]);

        return response()->json([
            'message' => 'Gracias por tu calificación!',
            'data'    => $review->fresh(),
        ]);
    }

    /** Listado para owner — moderar / des-aprobar. */
    public function indexAdmin(): JsonResponse
    {
        $items = Review::query()->orderByDesc('id')->limit(100)->get();
        return response()->json(['data' => $items]);
    }

    /** Toggle aprobado por owner. */
    public function toggleAprobado(Review $review): JsonResponse
    {
        $review->update(['aprobado' => ! $review->aprobado]);
        return response()->json(['data' => $review]);
    }

    /** F100 — Borrar review (definitivo). Útil para spam/ofensa. */
    public function destroyAdmin(Review $review): JsonResponse
    {
        $review->delete();
        return response()->json(null, 204);
    }
}
