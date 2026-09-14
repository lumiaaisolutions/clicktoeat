<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreSucursalRequest;
use App\Models\Local;
use App\Services\Organizations\SucursalService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Self-service de sucursales para owners Premium (ADR-014).
 *   GET  /me/sucursales  → lista las sucursales de mi organización + límite
 *   POST /me/sucursales  → alta de una sucursal nueva
 *
 * Gate de plan (Premium) por middleware `feature:sucursales_consolidadas`.
 */
class SucursalController extends Controller
{
    public function __construct(private readonly SucursalService $service) {}

    public function index(Request $request): JsonResponse
    {
        $padre = $this->localActual();
        $limite = $padre->plan?->max_sucursales;

        $sucursales = $padre->organization_id
            ? Local::where('organization_id', $padre->organization_id)
                ->select('id', 'nombre', 'slug', 'logo_url', 'color_primario', 'activo')
                ->orderBy('id')
                ->get()
            : collect([$padre->only('id', 'nombre', 'slug', 'logo_url', 'color_primario', 'activo')]);

        return response()->json([
            'data' => $sucursales,
            'meta' => [
                'total' => $this->service->conteoActual($padre),
                'limite' => $limite,               // null = ilimitado
                'puede_crear' => $limite === null || $this->service->conteoActual($padre) < $limite,
                'current_local_id' => $request->user()->local_id,
            ],
        ]);
    }

    public function store(StoreSucursalRequest $request): JsonResponse
    {
        $padre = $this->localActual();
        $limite = $padre->plan?->max_sucursales;
        $actual = $this->service->conteoActual($padre);

        if ($limite !== null && $actual >= $limite) {
            return response()->json([
                'message' => "Tu plan permite hasta {$limite} sucursal(es). Ya tienes {$actual}.",
                'code' => 'SUCURSAL_LIMIT_REACHED',
                'limite' => $limite,
                'actual' => $actual,
            ], 422);
        }

        $sucursal = $this->service->crear($request->user(), $padre, $request->validated());

        return response()->json([
            'data' => [
                'id' => $sucursal->id,
                'nombre' => $sucursal->nombre,
                'slug' => $sucursal->slug,
                'logo_url' => $sucursal->logo_url,
                'color_primario' => $sucursal->color_primario,
            ],
            'message' => 'Sucursal creada. Ya puedes cambiarte a ella desde el selector de sucursales.',
        ], 201);
    }

    /** El local desde el que opera el owner es el "padre" de la nueva sucursal. */
    private function localActual(): Local
    {
        $local = app(TenantContext::class)->local();
        abort_if($local === null, 409, 'No hay un local activo en la sesión.');

        return $local->loadMissing('plan', 'organization');
    }
}
