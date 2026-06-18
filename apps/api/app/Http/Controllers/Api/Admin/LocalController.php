<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLocalRequest;
use App\Http\Requests\Admin\UpdateLocalRequest;
use App\Http\Resources\LocalResource;
use App\Models\Local;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * @OA\Tag(name="Super Admin: Locales", description="Gestión global de locales — solo super_admin.")
 */
class LocalController extends Controller
{
    /**
     * @OA\Get(
     *     path="/admin/locales",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     summary="Lista todos los locales (activos, suspendidos y eliminados).",
     *     @OA\Parameter(name="q", in="query", @OA\Schema(type="string"), description="Búsqueda por nombre o slug"),
     *     @OA\Parameter(name="estado", in="query", @OA\Schema(type="string", enum={"activos","suspendidos","todos"})),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Local::query()->withCount(['productos', 'categorias', 'pedidos'])
            ->with('owner:id,nombre,email', 'plan:id,slug,nombre,precio_mxn_centavos');

        // Soft-deleted: incluirlos al filtrar por 'borrados' o 'todos'.
        $estado = $request->input('estado', 'todos');
        if (in_array($estado, ['borrados', 'todos'], true)) {
            $query->withTrashed();
        }

        if ($request->filled('q')) {
            $term = '%'.trim($request->string('q')).'%';
            $query->where(fn ($q) => $q->where('nombre', 'like', $term)->orWhere('slug', 'like', $term));
        }

        match ($estado) {
            'activos'      => $query->where('activo', true)->where('suspendido', false)->whereNull('deleted_at'),
            'suspendidos'  => $query->where('suspendido', true)->whereNull('deleted_at'),
            'borrados'     => $query->whereNotNull('deleted_at'),
            default        => null,
        };

        return LocalResource::collection($query->orderBy('nombre')->get());
    }

    /**
     * @OA\Post(
     *     path="/admin/locales",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     summary="Alta de un nuevo local, opcionalmente con su owner inicial.",
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreLocalRequest $request): JsonResponse
    {
        $local = DB::transaction(function () use ($request) {
            $local = Local::create(array_filter([
                'nombre'             => $request->input('nombre'),
                'slug'               => $request->input('slug'),
                'giro'               => $request->input('giro'),
                'tagline'            => $request->input('tagline'),
                'whatsapp'           => $request->input('whatsapp'),
                'telefono'           => $request->input('telefono'),
                'email_contacto'     => $request->input('email_contacto'),
                'direccion'          => $request->input('direccion'),
                'color_primario'     => $request->input('color_primario',   '#FF2D2D'),
                'color_secundario'   => $request->input('color_secundario', '#0B0B0F'),
                'color_fondo'        => $request->input('color_fondo',      '#FAFAF7'),
                'tipografia'         => $request->input('tipografia',       'Bricolage Grotesque'),
                'delivery_fee'         => $request->input('delivery_fee', 0),
                'delivery_min_minutos' => $request->input('delivery_min_minutos', 30),
                'activo'             => true,
                'suspendido'         => false,
            ], fn ($v) => $v !== null));

            if ($request->filled('owner')) {
                $owner = User::create([
                    'nombre'   => $request->input('owner.nombre'),
                    'email'    => $request->input('owner.email'),
                    'password' => Hash::make($request->input('owner.password')),
                    'rol'      => 'owner',
                    'local_id' => $local->id,
                    'email_verified_at' => now(),
                ]);
                $local->forceFill(['owner_id' => $owner->id])->save();
            }

            // Plantillas de productos por giro (no-op si no hay giro)
            app(\App\Services\ProductTemplates\ProductTemplatesService::class)->seedFor($local);

            return $local;
        });

        return (new LocalResource($local->fresh('owner')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @OA\Get(
     *     path="/admin/locales/{local}",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="local", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Local $local): LocalResource
    {
        return new LocalResource(
            $local->loadCount(['productos', 'categorias', 'pedidos'])
                  ->load('owner:id,nombre,email')
        );
    }

    /**
     * @OA\Patch(
     *     path="/admin/locales/{local}",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="local", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateLocalRequest $request, Local $local): LocalResource
    {
        $local->update($request->validated());
        return new LocalResource($local->fresh('owner'));
    }

    /**
     * @OA\Post(
     *     path="/admin/locales/{local}/suspender",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="local", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function suspender(Local $local): LocalResource
    {
        $local->update(['suspendido' => true]);
        return new LocalResource($local->fresh());
    }

    /**
     * @OA\Post(
     *     path="/admin/locales/{local}/reactivar",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="local", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function reactivar(Local $local): LocalResource
    {
        $local->update(['suspendido' => false, 'activo' => true]);
        return new LocalResource($local->fresh());
    }

    /**
     * Override manual de billing por el super admin. Sirve para:
     *  - Marcar un local como "paga externo" (efectivo/transferencia) — bypassea Stripe.
     *  - Cambiar plan_status manualmente (active / trialing / past_due / canceled).
     *  - Asignar plan sin pasar por checkout (ej. cliente VIP, demo, partner).
     */
    public function updateBilling(\Illuminate\Http\Request $req, Local $local): LocalResource
    {
        $data = $req->validate([
            'pago_externo'        => ['sometimes', 'boolean'],
            'pago_externo_notas'  => ['sometimes', 'nullable', 'string', 'max:250'],
            'plan_status'         => ['sometimes', 'nullable', 'in:trialing,active,past_due,canceled,incomplete'],
            'plan_id'             => ['sometimes', 'nullable', 'integer', 'exists:plans,id'],
            'trial_ends_at'           => ['sometimes', 'nullable', 'date'],
            'current_period_ends_at'  => ['sometimes', 'nullable', 'date'],
        ]);

        // F100g — Si el super_admin marca el local como `trialing` SIN
        // proporcionar `trial_ends_at`, auto-setear a 14 días desde hoy.
        // Sin esto, el frontend mostraba "Tu trial termina en  días"
        // (sin número) porque daysUntilTrialEnd() devuelve null cuando
        // trial_ends_at es null. También aplica si el local YA estaba en
        // otro estado y se cambia a trialing sin la fecha.
        $vaATrial = ($data['plan_status'] ?? null) === 'trialing';
        $sinFecha = empty($data['trial_ends_at']) && empty($local->trial_ends_at);
        if ($vaATrial && $sinFecha) {
            $data['trial_ends_at'] = now()->addDays(14);
        }

        $local->update($data);
        return new LocalResource($local->fresh());
    }

    /**
     * @OA\Delete(
     *     path="/admin/locales/{local}",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="local", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Local $local): JsonResponse
    {
        $local->delete();  // soft-delete
        return response()->json(null, 204);
    }

    /**
     * @OA\Post(
     *     path="/admin/locales/{local}/restore",
     *     tags={"Super Admin: Locales"},
     *     security={{"sanctum":{}}},
     *     summary="Restaura un local soft-deleted.",
     *     @OA\Parameter(name="local", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function restore(int $id): LocalResource
    {
        $local = Local::withTrashed()->findOrFail($id);
        $local->restore();

        return new LocalResource($local->fresh());
    }
}
