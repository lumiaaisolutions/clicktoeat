<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Local\UpdateBrandingRequest;
use App\Http\Resources\LocalResource;
use App\Models\Local;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @OA\Tag(name="Local (mío)", description="Configuración y branding del local del usuario autenticado.")
 */
class LocalController extends Controller
{
    /**
     * @OA\Get(
     *     path="/local",
     *     tags={"Local (mío)"},
     *     security={{"sanctum":{}}},
     *     summary="Devuelve el local del usuario autenticado.",
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Request $request): LocalResource
    {
        $local = $this->resolveLocal($request);
        $this->authorize('view', $local);
        return new LocalResource($local);
    }

    /**
     * @OA\Patch(
     *     path="/local",
     *     tags={"Local (mío)"},
     *     security={{"sanctum":{}}},
     *     summary="Actualiza branding y configuración del local del usuario autenticado.",
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateBrandingRequest $request): LocalResource
    {
        $local = $this->resolveLocal($request);
        $local->update($request->validated());
        return new LocalResource($local->fresh());
    }

    protected function resolveLocal(Request $request): Local
    {
        $user = $request->user();

        $local = Local::withoutGlobalScopes()
            ->where('id', $user->local_id)
            ->first();

        if (! $local) {
            throw new NotFoundHttpException('Tu usuario no está vinculado a un local.');
        }

        // bind for the policy
        $request->route()?->setParameter('local', $local);

        return $local;
    }
}
