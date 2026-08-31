<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PedidoResource;
use App\Models\Caja;
use App\Models\CorteCaja;
use App\Models\Pedido;
use App\Services\Salon\CajaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\Rule;

class CajaController extends Controller
{
    public function __construct(protected CajaService $cajas) {}

    /** Pedidos de mostrador pendientes de cobro (Venta los mandó a caja). */
    public function pendientesMostrador(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Caja::class);

        $pedidos = Pedido::query()
            ->where('metodo_entrega', 'sucursal')
            ->whereNull('mesa_id')
            ->whereNull('cuenta_mesa_id')
            ->where('estado', '!=', 'cancelado')
            ->where('estado_pago', 'pendiente')
            ->with('detalles')
            ->orderBy('created_at')
            ->get();

        return PedidoResource::collection($pedidos);
    }

    /** Cobra un pedido de mostrador (pago único). */
    public function cobrarPedido(Request $req, Pedido $pedido): JsonResponse
    {
        $user = $req->user();
        abort_unless($user->isOwner() || $user->puedeAcceder('caja'), 403);
        // El binding resuelve cross-tenant (SubstituteBindings corre antes del
        // contexto); validamos el local explícitamente — es un endpoint de dinero.
        abort_unless($pedido->local_id === $user->local_id, 404);

        $data = $req->validate([
            'metodo_pago' => ['required', 'in:efectivo,tarjeta_entrega,tarjeta_tpv,transferencia'],
            'corte_caja_id' => ['nullable', 'integer', Rule::exists('cortes_caja', 'id')->where('local_id', $user->local_id)],
        ]);

        try {
            $pedido = $this->cajas->cobrarPedido($pedido, $data['metodo_pago'], $data['corte_caja_id'] ?? null);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => new PedidoResource($pedido)]);
    }

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Caja::class);

        return JsonResource::collection(Caja::query()->where('activa', true)->orderBy('nombre')->get());
    }

    public function show(Caja $caja): JsonResponse
    {
        $this->authorize('view', $caja);

        $corteAbierto = $caja->cortes()->whereNull('cerrada_at')->with('movimientos')->first();

        return response()->json(['data' => [
            'id' => $caja->id,
            'nombre' => $caja->nombre,
            'corte_abierto' => $corteAbierto,
        ]]);
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', Caja::class);
        $data = $req->validate(['nombre' => ['required', 'string', 'max:60']]);
        $caja = Caja::create($data);

        return response()->json(['data' => $caja], 201);
    }

    public function abrirCorte(Request $req, Caja $caja): JsonResponse
    {
        $this->authorize('operar', $caja);
        $data = $req->validate(['monto_inicial' => ['required', 'numeric', 'min:0']]);

        try {
            $corte = $this->cajas->abrirCorte($caja, $req->user(), (float) $data['monto_inicial']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $corte], 201);
    }

    public function agregarMovimiento(Request $req, CorteCaja $corte): JsonResponse
    {
        $this->authorize('operar', $corte);
        $data = $req->validate([
            'tipo' => ['required', 'in:fondo,retiro,vale'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'motivo' => ['nullable', 'string', 'max:200'],
        ]);

        try {
            $mov = $this->cajas->agregarMovimiento($corte, $data['tipo'], (float) $data['monto'], $data['motivo'] ?? null, $req->user());
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $mov], 201);
    }

    public function cerrarCorte(Request $req, CorteCaja $corte): JsonResponse
    {
        $this->authorize('operar', $corte);
        $data = $req->validate(['monto_contado' => ['required', 'numeric', 'min:0']]);

        try {
            $cerrado = $this->cajas->cerrarCorte($corte, $req->user(), (float) $data['monto_contado']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $cerrado]);
    }
}
