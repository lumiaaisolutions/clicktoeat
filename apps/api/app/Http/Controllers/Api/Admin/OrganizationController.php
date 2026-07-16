<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Gestión de organizaciones (sucursales consolidadas) — sólo super_admin,
 * mismo criterio que la asignación de Locales a Users (F71, UserLocalesController).
 * Ver ADR-014.
 */
class OrganizationController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return JsonResource::collection(Organization::query()->with('locales:id,nombre,organization_id')->get());
    }

    public function store(Request $req): JsonResponse
    {
        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'owner_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);
        $org = Organization::create($data);

        return response()->json(['data' => $org], 201);
    }

    public function asignarLocal(Request $req, Organization $organization): JsonResponse
    {
        $data = $req->validate(['local_id' => ['required', 'integer', 'exists:locales,id']]);

        $local = Local::withoutGlobalScopes()->findOrFail($data['local_id']);
        $local->update(['organization_id' => $organization->id]);

        return response()->json(['data' => $local->fresh()]);
    }

    public function desasignarLocal(Organization $organization, int $localId): JsonResponse
    {
        $local = Local::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->findOrFail($localId);
        $local->update(['organization_id' => null]);

        return response()->json(null, 204);
    }
}
