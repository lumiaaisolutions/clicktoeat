<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * @OA\Tag(name="Audit log", description="Historial de cambios sensibles del local (sólo owner).")
 */
class AuditLogController extends Controller
{
    /**
     * @OA\Get(
     *     path="/audit-logs",
     *     tags={"Audit log"},
     *     security={{"sanctum":{}}},
     *     summary="Lista paginada del audit log del local autenticado.",
     *     @OA\Parameter(name="resource_type", in="query", @OA\Schema(type="string"), description="Filtrar por modelo (Producto, Pedido, etc.)"),
     *     @OA\Parameter(name="action", in="query", @OA\Schema(type="string", enum={"created","updated","deleted","restored"})),
     *     @OA\Parameter(name="actor_user_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="desde", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=50)),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        if (! $user->isOwner() && ! $user->isSuperAdmin()) {
            throw new AccessDeniedHttpException('Sólo owner o super_admin pueden ver el audit log.');
        }

        $query = AuditLog::query()->with('actor:id,nombre,rol');

        // Super admin ve TODO; owner sólo su local
        if (! $user->isSuperAdmin()) {
            $query->where('local_id', $user->local_id);
        }

        // Filtros
        if ($request->filled('resource_type')) {
            $term = $request->string('resource_type')->toString();
            $query->where(function ($q) use ($term) {
                $q->where('resource_type', 'App\\Models\\'.$term)
                  ->orWhere('resource_type', $term);
            });
        }
        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }
        if ($request->filled('actor_user_id')) {
            $query->where('actor_user_id', $request->integer('actor_user_id'));
        }
        if ($request->filled('desde')) {
            $query->whereDate('created_at', '>=', $request->date('desde'));
        }
        if ($request->filled('hasta')) {
            $query->whereDate('created_at', '<=', $request->date('hasta'));
        }

        $perPage = min((int) $request->input('per_page', 50), 100);

        return AuditLogResource::collection(
            $query->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage)
        );
    }
}
