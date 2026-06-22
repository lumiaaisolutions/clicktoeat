<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SEV-12 nota: subscribe + unsubscribe usan inline auth (abort 401 + filter
 * por user_id). publicKey es endpoint público intencional.
 *
 * Hardening futuro (similar a SEV-11 de MobileDevice): updateOrCreate por
 * endpoint permite a un atacante con endpoint conocido reasignar la
 * suscripción a su user_id. Considerar 409 reject cross-user. No urgente
 * porque endpoints push son largos y aleatorios (no enumerables).
 */
class PushSubscriptionController extends Controller
{
    /** Devuelve la clave pública VAPID al frontend. */
    public function publicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => (string) env('VAPID_PUBLIC_KEY', ''),
        ]);
    }

    /** Registra (o actualiza) la suscripción del browser actual. */
    public function subscribe(Request $req): JsonResponse
    {
        $data = $req->validate([
            'endpoint'    => ['required', 'string', 'max:500'],
            'keys.p256dh' => ['required', 'string', 'max:128'],
            'keys.auth'   => ['required', 'string', 'max:64'],
        ]);

        $user = $req->user();
        if (! $user) abort(401);

        $sub = PushSubscription::updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id'      => $user->id,
                'local_id'     => $user->local_id,
                'p256dh'       => $data['keys']['p256dh'],
                'auth'         => $data['keys']['auth'],
                'user_agent'   => substr((string) $req->userAgent(), 0, 200),
                'last_used_at' => now(),
            ],
        );

        return response()->json(['data' => ['id' => $sub->id]], 201);
    }

    public function unsubscribe(Request $req): JsonResponse
    {
        $req->validate(['endpoint' => ['required', 'string']]);
        PushSubscription::query()
            ->where('endpoint', $req->input('endpoint'))
            ->where('user_id', $req->user()?->id)
            ->delete();
        return response()->json(['data' => null]);
    }
}
