<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ToppingGroup\StoreToppingGroupRequest;
use App\Http\Requests\ToppingGroup\UpdateToppingGroupRequest;
use App\Http\Resources\ToppingGroupResource;
use App\Models\ToppingGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Catálogo reutilizable de toppings / grupos de opciones. Tenant-scoped por el
 * middleware `tenant` + trait BelongsToTenant. Ver docs/features/toppings.md.
 */
class ToppingGroupController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ToppingGroup::class);

        return ToppingGroupResource::collection(
            ToppingGroup::query()->orderBy('nombre')->get()
        );
    }

    public function store(StoreToppingGroupRequest $request): JsonResponse
    {
        $group = ToppingGroup::create($request->validated());

        return (new ToppingGroupResource($group))->response()->setStatusCode(201);
    }

    public function update(UpdateToppingGroupRequest $request, ToppingGroup $topping): ToppingGroupResource
    {
        $topping->update($request->validated());

        return new ToppingGroupResource($topping->fresh());
    }

    public function destroy(ToppingGroup $topping): JsonResponse
    {
        $this->authorize('delete', $topping);
        $topping->delete();

        return response()->json(null, 204);
    }
}
