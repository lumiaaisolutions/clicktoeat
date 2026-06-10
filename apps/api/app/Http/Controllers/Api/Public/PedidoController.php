<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pedido\StorePublicPedidoRequest;
use App\Http\Resources\PedidoResource;
use App\Models\Local;
use App\Services\Inventory\InsufficientStockException;
use App\Services\Orders\OrderService;
use App\Support\HorarioCalculator;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @OA\Tag(name="Pedidos público", description="Crea pedidos sin autenticación desde la landing del local.")
 */
class PedidoController extends Controller
{
    public function __construct(protected OrderService $orders) {}

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * @OA\Post(
     *     path="/public/pedidos/{slug}",
     *     tags={"Pedidos público"},
     *     summary="Crea un pedido para el local identificado por slug.",
     *     @OA\Parameter(name="slug", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"cliente","metodo_entrega","metodo_pago","items"},
     *         @OA\Property(property="cliente", type="object",
     *             @OA\Property(property="nombre", type="string"),
     *             @OA\Property(property="telefono", type="string"),
     *             @OA\Property(property="direccion", type="string"),
     *             @OA\Property(property="notas", type="string")
     *         ),
     *         @OA\Property(property="metodo_entrega", type="string", enum={"pickup","delivery"}),
     *         @OA\Property(property="metodo_pago", type="string", enum={"efectivo","tarjeta_entrega","transferencia"}),
     *         @OA\Property(property="items", type="array", @OA\Items(
     *             required={"producto_id","cantidad"},
     *             @OA\Property(property="producto_id", type="integer"),
     *             @OA\Property(property="cantidad", type="integer", minimum=1),
     *             @OA\Property(property="notas", type="string"),
     *             @OA\Property(property="extras", type="array", @OA\Items(type="object"))
     *         ))
     *     )),
     *     @OA\Response(response=201, description="Created"),
     *     @OA\Response(response=409, description="Stock insuficiente"),
     *     @OA\Response(response=422, description="Validación")
     * )
     */
    public function store(StorePublicPedidoRequest $request, string $slug): JsonResponse
    {
        $local = Local::query()
            ->activos()
            ->bySlug($slug)
            ->first();

        if (! $local) {
            throw new NotFoundHttpException('Local no encontrado o no disponible.');
        }

        // Bloquea pedidos públicos cuando el local está cerrado (horario o cierre temporal).
        // El POS interno NO pasa por aquí — los owners siguen vendiendo en caja.
        $estado = HorarioCalculator::estado($local);
        if ($estado['abierto'] === false) {
            return response()->json([
                'message' => "{$local->nombre} no está aceptando pedidos: {$estado['mensaje']}.",
                'estado'  => $estado,
            ], 409);
        }

        // Validar radio de entrega si el local tiene coordenadas y el pedido es delivery
        $validated = $request->validated();
        if (
            $validated['metodo_entrega'] === 'delivery'
            && $local->lat && $local->lng
            && isset($validated['cliente']['lat'], $validated['cliente']['lng'])
        ) {
            $distKm = $this->haversineKm(
                (float) $local->lat, (float) $local->lng,
                (float) $validated['cliente']['lat'], (float) $validated['cliente']['lng'],
            );
            $radioKm = $local->delivery_radio_km ?? 5;
            if ($distKm > $radioKm) {
                return response()->json([
                    'message' => "Tu dirección está fuera del radio de entrega ({$radioKm} km). Distancia: " . round($distKm, 1) . ' km.',
                ], 422);
            }
        }

        try {
            $pedido = $this->orders->crear($local, $validated);
        } catch (InsufficientStockException $e) {
            return response()->json([
                'message'  => $e->getMessage(),
                'faltantes' => $e->faltantes,
            ], 409);
        }

        return (new PedidoResource($pedido->load('detalles')))
            ->additional([
                'whatsapp_url' => $pedido->whatsapp_url,
            ])
            ->response()
            ->setStatusCode(201);
    }
}
