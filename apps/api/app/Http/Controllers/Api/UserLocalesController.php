<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Multi-sucursal (F71). Endpoints:
 *   GET  /me/locales            → todos los locales a los que tengo acceso
 *   POST /me/switch-local/{id}  → cambia mi `local_id activo`
 *   POST /admin/users/{user}/locales (super) → asignar locales a un user
 *   DELETE /admin/users/{user}/locales/{local} → revocar
 */
class UserLocalesController extends Controller
{
    public function myLocales(Request $req): JsonResponse
    {
        $user = $req->user();
        if (! $user) abort(401);

        $locales = $user->locales()->select(
            'locales.id', 'locales.nombre', 'locales.slug', 'locales.logo_url', 'locales.color_primario',
        )->get();

        return response()->json([
            'data' => $locales,
            'current_local_id' => $user->local_id,
        ]);
    }

    public function switchLocal(Request $req, int $localId): JsonResponse
    {
        $user = $req->user();
        if (! $user) abort(401);
        if (! $user->canAccessLocal($localId)) {
            return response()->json(['message' => 'No tienes acceso a ese local.'], 403);
        }

        $user->local_id = $localId;
        $user->save();

        $local = Local::find($localId);
        return response()->json([
            'data' => [
                'id' => $local->id,
                'nombre' => $local->nombre,
                'slug'   => $local->slug,
            ],
        ]);
    }

    /** Super-admin: lista los locales asignados a otro user. */
    public function listForUser(Request $req, User $user): JsonResponse
    {
        if (! $req->user()?->isSuperAdmin()) abort(403);

        return response()->json([
            'data' => $user->locales()->select(
                'locales.id', 'locales.nombre', 'locales.slug',
                'locales.logo_url', 'locales.color_primario',
            )->get(),
            'current_local_id' => $user->local_id,
        ]);
    }

    public function attachToUser(Request $req, User $user): JsonResponse
    {
        if (! $req->user()?->isSuperAdmin()) abort(403);
        $data = $req->validate([
            'local_ids'   => ['required', 'array', 'min:1'],
            'local_ids.*' => ['integer', 'exists:locales,id'],
        ]);

        $user->locales()->syncWithoutDetaching($data['local_ids']);
        // Si no tenía local activo, setea el primero asignado
        if (! $user->local_id) {
            $user->local_id = $data['local_ids'][0];
            $user->save();
        }
        return response()->json(['data' => $user->locales()->select('locales.id','locales.nombre','locales.slug')->get()]);
    }

    public function detachFromUser(Request $req, User $user, int $localId): JsonResponse
    {
        if (! $req->user()?->isSuperAdmin()) abort(403);
        $user->locales()->detach($localId);

        if ($user->local_id === $localId) {
            // Cae al primer local que le quede o null
            $first = $user->locales()->first();
            $user->local_id = $first?->id;
            $user->save();
        }

        return response()->json(['data' => $user->locales()->select('locales.id','locales.nombre','locales.slug')->get()]);
    }
}
