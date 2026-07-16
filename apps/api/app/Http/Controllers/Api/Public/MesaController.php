<?php

namespace App\Http\Controllers\Api\Public;

use App\Events\MeseroLlamado;
use App\Http\Controllers\Controller;
use App\Http\Requests\Mesa\StoreMesaPedidoRequest;
use App\Http\Resources\PedidoResource;
use App\Models\LlamadoMesero;
use App\Models\Mesa;
use App\Services\Inventory\InsufficientStockException;
use App\Services\Orders\OrderService;
use App\Services\Salon\CuentaMesaService;
use App\Support\Features;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Endpoints públicos (sin auth) usados por el cliente que escanea el QR
 * de una mesa. F102 — operación de salón, gated por Features::DINE_IN.
 */
class MesaController extends Controller
{
    public function __construct(protected OrderService $orders, protected CuentaMesaService $cuentas) {}

    private function resolveMesa(string $qrToken): Mesa
    {
        $mesa = Mesa::query()
            ->withoutTenantScope()
            ->with(['local', 'piso'])
            ->where('qr_token', $qrToken)
            ->first();

        if (! $mesa || ! $mesa->local || ! $mesa->local->activo) {
            throw new NotFoundHttpException('Mesa no encontrada.');
        }
        // Mismo criterio que el middleware `feature:dine_in`: un local sin
        // plan asignado (legacy/dev) no está restringido; uno con plan
        // necesita la feature activa. Ver RequiresFeature::handle().
        if ($mesa->local->plan_id !== null && ! Features::has($mesa->local, Features::DINE_IN)) {
            throw new NotFoundHttpException('Mesa no encontrada.');
        }

        return $mesa;
    }

    public function show(string $qrToken): JsonResponse
    {
        $mesa = $this->resolveMesa($qrToken);

        return response()->json(['data' => [
            'mesaId' => $mesa->id,
            'etiqueta' => $mesa->etiqueta,
            'localSlug' => $mesa->local->slug,
            'localNombre' => $mesa->local->nombre,
        ]]);
    }

    public function storePedido(StoreMesaPedidoRequest $request, string $qrToken): JsonResponse
    {
        $mesa = $this->resolveMesa($qrToken);

        try {
            $pedido = $this->orders->crear($mesa->local, $request->toOrderInput($mesa->id));
        } catch (InsufficientStockException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'faltantes' => $e->faltantes,
            ], 409);
        }

        // F102 — agrupa el pedido bajo la cuenta abierta de la mesa (crea una si no existe).
        $cuenta = $this->cuentas->abrirParaMesa($mesa);
        $this->cuentas->adjuntarPedido($cuenta, $pedido);

        return (new PedidoResource($pedido->fresh()->load('detalles')))
            ->response()->setStatusCode(201);
    }

    public function llamarMesero(string $qrToken): JsonResponse
    {
        $mesa = $this->resolveMesa($qrToken);

        $llamado = LlamadoMesero::create([
            'local_id' => $mesa->local_id,
            'mesa_id' => $mesa->id,
        ]);

        event(new MeseroLlamado($llamado));

        return response()->json(['data' => ['id' => $llamado->id]], 201);
    }
}
