<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffAttendanceResource;
use App\Models\StaffAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StaffAttendanceController extends Controller
{
    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', StaffAttendance::class);

        $user = $req->user();
        $query = StaffAttendance::query()->with('user:id,nombre')->orderByDesc('entrada');

        if ($user->isOwner()) {
            if ($req->filled('user_id')) {
                $query->where('user_id', $req->integer('user_id'));
            }
        } else {
            $query->where('user_id', $user->id);
        }

        if ($req->filled('desde')) {
            $query->where('entrada', '>=', $req->date('desde'));
        }
        if ($req->filled('hasta')) {
            $query->where('entrada', '<=', $req->date('hasta'));
        }

        return StaffAttendanceResource::collection($query->paginate(50));
    }

    public function estado(Request $req): JsonResponse
    {
        $this->authorize('viewAny', StaffAttendance::class);

        $abierta = StaffAttendance::query()
            ->where('user_id', $req->user()->id)
            ->whereNull('salida')
            ->latest('entrada')
            ->first();

        return response()->json(['data' => [
            'abierta' => $abierta ? new StaffAttendanceResource($abierta) : null,
        ]]);
    }

    public function entrada(Request $req): JsonResponse
    {
        $this->authorize('viewAny', StaffAttendance::class);

        $user = $req->user();
        $yaAbierta = StaffAttendance::query()->where('user_id', $user->id)->whereNull('salida')->exists();
        if ($yaAbierta) {
            return response()->json(['message' => 'Ya tienes una entrada registrada sin salida.'], 409);
        }

        $attendance = StaffAttendance::create(['user_id' => $user->id, 'entrada' => now()]);

        return response()->json(['data' => new StaffAttendanceResource($attendance)], 201);
    }

    public function salida(Request $req): JsonResponse
    {
        $this->authorize('viewAny', StaffAttendance::class);

        $user = $req->user();
        $attendance = StaffAttendance::query()
            ->where('user_id', $user->id)
            ->whereNull('salida')
            ->latest('entrada')
            ->first();

        if (! $attendance) {
            return response()->json(['message' => 'No tienes una entrada abierta.'], 409);
        }

        $this->authorize('manage', $attendance);
        $attendance->update(['salida' => now()]);

        return response()->json(['data' => new StaffAttendanceResource($attendance)]);
    }

    public function destroy(StaffAttendance $asistencia): JsonResponse
    {
        $this->authorize('delete', $asistencia);
        $asistencia->delete();

        return response()->json(null, 204);
    }
}
