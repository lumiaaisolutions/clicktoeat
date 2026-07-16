<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * Ventana de traslape: una mesa no puede tener dos reservas activas dentro
 * de este margen entre sí — no hay `duracion_minutos` explícita en v1, se
 * asume una comida estándar de ~2h (ver plan de implementación §3.6).
 */
class ReservacionController extends Controller
{
    private const VENTANA_TRASLAPE_MINUTOS = 90;

    private function hayTraslape(?int $mesaId, string $fechaHora, ?int $ignorarId = null): bool
    {
        if ($mesaId === null) {
            return false; // sin mesa asignada todavía, nada que traslapar
        }

        $inicio = Carbon::parse($fechaHora)->subMinutes(self::VENTANA_TRASLAPE_MINUTOS);
        $fin = Carbon::parse($fechaHora)->addMinutes(self::VENTANA_TRASLAPE_MINUTOS);

        return Reservacion::query()
            ->where('mesa_id', $mesaId)
            ->whereNotIn('estado', ['cancelada'])
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->whereBetween('fecha_hora', [$inicio, $fin])
            ->exists();
    }

    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Reservacion::class);
        $q = Reservacion::query()->with('mesa')->orderBy('fecha_hora');
        if ($req->filled('estado')) {
            $q->where('estado', $req->string('estado'));
        }

        return JsonResource::collection($q->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', Reservacion::class);
        $data = $req->validate([
            'mesa_id' => ['nullable', 'integer', 'exists:mesas,id'],
            'cliente_nombre' => ['required', 'string', 'max:120'],
            'cliente_telefono' => ['required', 'string', 'max:20'],
            'fecha_hora' => ['required', 'date'],
            'personas' => ['required', 'integer', 'min:1', 'max:50'],
            'notas' => ['nullable', 'string', 'max:300'],
        ]);

        if ($this->hayTraslape($data['mesa_id'] ?? null, $data['fecha_hora'])) {
            return response()->json([
                'message' => 'Esa mesa ya tiene otra reservación cerca de ese horario.',
            ], 409);
        }

        $reserva = Reservacion::create($data);

        return response()->json(['data' => $reserva], 201);
    }

    public function update(Request $req, Reservacion $reservacion): JsonResponse
    {
        $this->authorize('update', $reservacion);
        $data = $req->validate([
            'mesa_id' => ['nullable', 'integer', 'exists:mesas,id'],
            'fecha_hora' => ['sometimes', 'date'],
            'personas' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'estado' => ['sometimes', 'in:pendiente,confirmada,cancelada,cumplida'],
            'notas' => ['nullable', 'string', 'max:300'],
        ]);

        $mesaId = $data['mesa_id'] ?? $reservacion->mesa_id;
        $fechaHora = $data['fecha_hora'] ?? $reservacion->fecha_hora->toDateTimeString();
        if (
            ($data['estado'] ?? 'pendiente') !== 'cancelada'
            && (array_key_exists('mesa_id', $data) || array_key_exists('fecha_hora', $data))
            && $this->hayTraslape($mesaId, $fechaHora, $reservacion->id)
        ) {
            return response()->json([
                'message' => 'Esa mesa ya tiene otra reservación cerca de ese horario.',
            ], 409);
        }

        $reservacion->update($data);

        return response()->json(['data' => $reservacion->fresh()]);
    }

    public function destroy(Reservacion $reservacion): JsonResponse
    {
        $this->authorize('delete', $reservacion);
        $reservacion->delete();

        return response()->json(null, 204);
    }
}
