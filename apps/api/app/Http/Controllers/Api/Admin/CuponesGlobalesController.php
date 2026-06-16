<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CuponGlobal;
use App\Models\Local;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CuponesGlobalesController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => CuponGlobal::orderByDesc('id')->get()]);
    }

    public function store(Request $req): JsonResponse
    {
        $data = $req->validate([
            'codigo'             => ['required', 'string', 'max:32', 'regex:/^[A-Z0-9_-]+$/'],
            'descripcion'        => ['nullable', 'string', 'max:200'],
            'tipo'               => ['required', 'in:porcentaje,monto'],
            'valor'              => ['required', 'numeric', 'min:0'],
            'min_subtotal'       => ['nullable', 'numeric', 'min:0'],
            'max_usos_por_local' => ['nullable', 'integer', 'min:1'],
            'aplicar_nuevos'     => ['sometimes', 'boolean'],
            'vigente_desde'      => ['nullable', 'date'],
            'vigente_hasta'      => ['nullable', 'date'],
        ]);
        $cg = CuponGlobal::create($data);
        return response()->json(['data' => $cg], 201);
    }

    /** Replica el cupón global a todos los locales activos. Idempotente. */
    public function sync(CuponGlobal $cg): JsonResponse
    {
        $count = 0;
        Local::query()->withoutGlobalScopes()
            ->where('activo', true)
            ->orderBy('id')
            ->chunk(100, function ($locales) use ($cg, &$count) {
                foreach ($locales as $local) {
                    $existing = DB::table('cupones')
                        ->where('local_id', $local->id)
                        ->where('codigo', $cg->codigo)
                        ->first();
                    if ($existing) continue;

                    DB::table('cupones')->insert([
                        'local_id'     => $local->id,
                        'codigo'       => $cg->codigo,
                        'descripcion'  => $cg->descripcion,
                        'tipo'         => $cg->tipo,
                        'valor'        => $cg->valor,
                        'min_subtotal' => $cg->min_subtotal,
                        'max_usos'     => $cg->max_usos_por_local,
                        'usos'         => 0,
                        'activo'       => true,
                        'vigente_desde'=> $cg->vigente_desde,
                        'vigente_hasta'=> $cg->vigente_hasta,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                    $count++;
                }
            });
        return response()->json(['data' => ['sincronizados' => $count]]);
    }

    public function destroy(CuponGlobal $cg): JsonResponse
    {
        $cg->delete();
        return response()->json(null, 204);
    }
}
