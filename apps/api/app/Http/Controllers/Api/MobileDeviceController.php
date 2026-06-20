<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterMobileDeviceRequest;
use App\Models\MobileDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileDeviceController extends Controller
{
    /**
     * Registra (o actualiza) un token de push de la app móvil.
     *
     * SEV-11 — Rechazamos la reasignación cross-user. Antes, un atacante que
     * obtenía el `expo_push_token` de otro user (los tokens Expo no son
     * secretos, pueden filtrarse via logs/SDK) podía silenciar al usuario
     * original reasignando el registro a su propia cuenta. Ahora respondemos
     * 409 Conflict cuando el token ya pertenece a otro user. Para el caso
     * legítimo (cocina compartida con login alternado), el primer user debe
     * llamar `unregister-device` antes de que otro lo reclame.
     */
    public function register(RegisterMobileDeviceRequest $req): JsonResponse
    {
        $user = $req->user();
        $data = $req->validated();

        $existing = MobileDevice::query()
            ->where('expo_push_token', $data['expo_push_token'])
            ->first();

        if ($existing && $existing->user_id !== $user->id) {
            return response()->json([
                'message' => 'Este dispositivo ya está registrado para otra cuenta. Cierra sesión en el otro dispositivo primero.',
                'code'    => 'device_already_registered',
            ], 409);
        }

        $device = MobileDevice::updateOrCreate(
            [
                'expo_push_token' => $data['expo_push_token'],
                'user_id'         => $user->id,
            ],
            [
                'local_id'     => $user->local_id,
                'platform'     => $data['platform'],
                'device_name'  => $data['device_name'] ?? null,
                'app_version'  => $data['app_version'] ?? null,
                'last_seen_at' => now(),
            ],
        );

        return response()->json([
            'data' => [
                'id'       => $device->id,
                'platform' => $device->platform,
            ],
        ], 201);
    }

    /** Borra el token (logout o desinstalación). */
    public function unregister(Request $req): JsonResponse
    {
        $req->validate(['expo_push_token' => ['required', 'string']]);

        MobileDevice::query()
            ->where('expo_push_token', $req->input('expo_push_token'))
            ->where('user_id', $req->user()?->id)
            ->delete();

        return response()->json(['data' => null]);
    }
}
