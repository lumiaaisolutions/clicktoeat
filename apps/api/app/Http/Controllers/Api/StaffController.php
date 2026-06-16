<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffRequest;
use App\Http\Requests\Staff\UpdateStaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;

/**
 * @OA\Tag(name="Staff", description="Gestión del equipo del local (sólo owner).")
 */
class StaffController extends Controller
{
    /**
     * @OA\Get(
     *     path="/local/staff",
     *     tags={"Staff"},
     *     security={{"sanctum":{}}},
     *     summary="Lista usuarios del local (owner + staff).",
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->where('local_id', $request->user()->local_id)
            ->orderBy('rol')      // owner primero, staff después
            ->orderBy('nombre')
            ->get();

        return StaffResource::collection($users);
    }

    /**
     * @OA\Post(
     *     path="/local/staff",
     *     tags={"Staff"},
     *     security={{"sanctum":{}}},
     *     summary="Crea un nuevo staff vinculado al local del owner autenticado."
     * )
     */
    public function store(StoreStaffRequest $request): JsonResponse
    {
        // Límite cuantitativo del plan SaaS (max_staff).
        $local = app(\App\Support\TenantContext::class)->local();
        $max   = $local?->plan?->max_staff;
        if ($max !== null) {
            $current = User::where('local_id', $local->id)->where('rol', 'staff')->count();
            if ($current >= $max) {
                throw new \App\Exceptions\PlanLimitException('staff', $max, $current);
            }
        }

        $permisos = $request->input('permisos');
        // Si el frontend mandó array vacío, lo persistimos como default mínimo
        // (acceso a pedidos). null o ausente también → default.
        if (! is_array($permisos) || $permisos === []) {
            $permisos = User::PERMISOS_DEFAULT_STAFF;
        }
        $permisos = array_values(array_intersect($permisos, User::MODULOS_VALIDOS));

        $staff = User::create([
            'nombre'             => $request->input('nombre'),
            'email'              => $request->input('email'),
            'password'           => Hash::make($request->input('password')),
            'rol'                => 'staff',
            'permisos'           => $permisos,
            'local_id'           => $request->user()->local_id,
            'email_verified_at'  => now(),
        ]);

        return (new StaffResource($staff))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @OA\Get(
     *     path="/local/staff/{staff}",
     *     tags={"Staff"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="staff", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(User $staff): StaffResource
    {
        $this->authorize('view', $staff);
        return new StaffResource($staff);
    }

    /**
     * @OA\Patch(
     *     path="/local/staff/{staff}",
     *     tags={"Staff"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="staff", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateStaffRequest $request, User $staff): StaffResource
    {
        $data = $request->validated();

        // Si el owner reseteó password, hashearla + invalidar todas las sesiones del staff
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
            $staff->tokens()->delete();
        }

        // Normalizar permisos: filtrar a módulos válidos.
        if (array_key_exists('permisos', $data)) {
            $permisos = $data['permisos'];
            if (! is_array($permisos) || $permisos === []) {
                $permisos = User::PERMISOS_DEFAULT_STAFF;
            }
            $data['permisos'] = array_values(array_intersect($permisos, User::MODULOS_VALIDOS));
        }

        $staff->update($data);

        return new StaffResource($staff->fresh());
    }

    /**
     * @OA\Delete(
     *     path="/local/staff/{staff}",
     *     tags={"Staff"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="staff", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(User $staff): JsonResponse
    {
        $this->authorize('delete', $staff);

        // Invalidar sesiones antes del soft-delete
        $staff->tokens()->delete();
        $staff->delete();

        return response()->json(null, 204);
    }
}
