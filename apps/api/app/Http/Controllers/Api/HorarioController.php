<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Local\UpdateHorariosRequest;
use App\Models\Local;
use App\Support\HorarioCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @OA\Tag(name="Horarios", description="Gestión de horarios de apertura del local + override manual.")
 */
class HorarioController extends Controller
{
    /**
     * @OA\Get(
     *     path="/local/horarios",
     *     tags={"Horarios"},
     *     security={{"sanctum":{}}},
     *     summary="Devuelve los horarios + estado calculado actual.",
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Request $request): JsonResponse
    {
        $local = $this->resolveLocal($request);

        return response()->json([
            'data' => [
                'horarios'         => $local->horarios ?? [],
                'cerrado_temporal' => (bool) $local->cerrado_temporal,
                'zona_horaria'     => $local->zona_horaria ?: 'America/Mexico_City',
                'estado'           => HorarioCalculator::estado($local),
            ],
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/local/horarios",
     *     tags={"Horarios"},
     *     security={{"sanctum":{}}},
     *     summary="Actualiza horarios + override manual de cierre."
     * )
     */
    public function update(UpdateHorariosRequest $request): JsonResponse
    {
        $local = $this->resolveLocal($request);

        $data = $request->validated();

        // Normalizar: ordenar horarios por día de la semana, deduplicar
        if (isset($data['horarios'])) {
            $orden = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
            $byDia = [];
            foreach ($data['horarios'] as $h) {
                $byDia[$h['dia']] = $h;  // último gana si hay duplicados
            }
            $data['horarios'] = array_values(array_filter(
                array_map(fn ($d) => $byDia[$d] ?? null, $orden),
            ));
        }

        $local->update($data);

        return response()->json([
            'data' => [
                'horarios'         => $local->horarios ?? [],
                'cerrado_temporal' => (bool) $local->cerrado_temporal,
                'zona_horaria'     => $local->zona_horaria ?: 'America/Mexico_City',
                'estado'           => HorarioCalculator::estado($local->fresh()),
            ],
        ]);
    }

    protected function resolveLocal(Request $request): Local
    {
        $user  = $request->user();
        $local = Local::withoutGlobalScopes()->find($user->local_id);
        if (! $local) {
            throw new NotFoundHttpException('Tu usuario no está vinculado a un local.');
        }
        return $local;
    }
}
