<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\Rule;

/**
 * CRUD de cupones del local autenticado. Tenant-scoped por TenantScope.
 */
class CuponController extends Controller
{
    public function index(Request $req): AnonymousResourceCollection
    {
        $q = Cupon::query()->orderBy('activo', 'desc')->orderBy('codigo');
        if ($req->boolean('vigentes')) $q->vigente();
        return JsonResource::collection($q->paginate(50));
    }

    public function store(Request $req): JsonResponse
    {
        $data = $this->validateData($req);
        $cupon = Cupon::create($data);
        return response()->json(['data' => $cupon], 201);
    }

    public function show(Cupon $cupon): JsonResponse
    {
        return response()->json(['data' => $cupon]);
    }

    public function update(Request $req, Cupon $cupon): JsonResponse
    {
        $data = $this->validateData($req, $cupon->id);
        $cupon->update($data);
        return response()->json(['data' => $cupon->fresh()]);
    }

    public function destroy(Cupon $cupon): JsonResponse
    {
        $cupon->delete();
        return response()->json(null, 204);
    }

    public function toggle(Cupon $cupon): JsonResponse
    {
        $cupon->update(['activo' => ! $cupon->activo]);
        return response()->json(['data' => $cupon]);
    }

    private function validateData(Request $req, ?int $ignoreId = null): array
    {
        $localId = app(\App\Support\TenantContext::class)->id();
        return $req->validate([
            'codigo'        => ['required', 'string', 'max:32', 'regex:/^[A-Z0-9\-_]+$/',
                Rule::unique('cupones', 'codigo')->where('local_id', $localId)->ignore($ignoreId)],
            'tipo'          => ['required', 'string', 'in:percent,fixed'],
            'valor'         => ['required', 'numeric', 'min:0.01'],
            'min_subtotal'  => ['nullable', 'numeric', 'min:0'],
            'max_descuento' => ['nullable', 'numeric', 'min:0'],
            'fecha_desde'   => ['nullable', 'date'],
            'fecha_hasta'   => ['nullable', 'date', 'after_or_equal:fecha_desde'],
            'max_usos'      => ['nullable', 'integer', 'min:1'],
            'activo'        => ['boolean'],
            // F100 — cupones programados por horario
            'hora_inicio'         => ['nullable', 'date_format:H:i'],
            'hora_fin'            => ['nullable', 'date_format:H:i', 'after:hora_inicio'],
            'dias_semana'         => ['nullable', 'array'],
            'dias_semana.*'       => ['string', 'in:mon,tue,wed,thu,fri,sat,sun'],
            'destacado_en_landing'=> ['boolean'],
            'productos_sugeridos' => ['nullable', 'array'],
            'productos_sugeridos.*'=> ['integer', 'exists:productos,id'],
        ]);
    }
}
