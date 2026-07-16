<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffShift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StaffShiftController extends Controller
{
    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', StaffShift::class);
        $q = StaffShift::query()->with('user:id,nombre')->orderBy('inicio');
        if ($req->filled('user_id')) {
            $q->where('user_id', $req->integer('user_id'));
        }

        return JsonResource::collection($q->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', StaffShift::class);
        $data = $req->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('local_id', $req->user()->local_id)],
            'inicio' => ['required', 'date'],
            'fin' => ['required', 'date', 'after:inicio'],
            'rol' => ['required', 'in:cocina,mesero,caja'],
        ]);
        $shift = StaffShift::create($data);

        return response()->json(['data' => $shift], 201);
    }

    public function destroy(StaffShift $staffShift): JsonResponse
    {
        $this->authorize('delete', $staffShift);
        $staffShift->delete();

        return response()->json(null, 204);
    }

    /**
     * Forecast v1: volumen histórico de pedidos por hora/día de la semana
     * (sin modelo predictivo — ver plan de implementación §3.10).
     */
    public function forecast(Request $req): JsonResponse
    {
        $this->authorize('viewAny', StaffShift::class);

        $localId = $req->user()->local_id;
        $isMysql = DB::connection()->getDriverName() === 'mysql';
        $selectRaw = $isMysql
            ? 'DAYOFWEEK(created_at) - 1 as dow, HOUR(created_at) as hour, COUNT(*) as total'
            : "strftime('%w', created_at) as dow, strftime('%H', created_at) as hour, COUNT(*) as total";

        $rows = DB::table('pedidos')
            ->selectRaw($selectRaw)
            ->where('local_id', $localId)
            ->where('created_at', '>=', now()->subDays(28))
            ->groupBy('dow', 'hour')
            ->get();

        return response()->json(['data' => $rows]);
    }
}
