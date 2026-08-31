<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuentaMesa;
use App\Models\GiftCard;
use App\Models\Mesa;
use App\Services\Salon\CuentaMesaService;
use App\Services\Salon\GiftCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\Rule;

class CuentaMesaController extends Controller
{
    public function __construct(protected CuentaMesaService $cuentas, protected GiftCardService $giftCards) {}

    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', CuentaMesa::class);

        $q = CuentaMesa::query()->with(['mesa', 'pedidos'])->orderByDesc('created_at');
        if ($req->filled('estado')) {
            $q->where('estado', $req->string('estado'));
        } else {
            $q->whereIn('estado', ['abierta', 'pre_cuenta']);
        }

        return JsonResource::collection($q->get());
    }

    public function show(CuentaMesa $cuenta): JsonResponse
    {
        $this->authorize('view', $cuenta);

        return response()->json(['data' => $cuenta->load(['mesa', 'pedidos.detalles', 'pagos'])]);
    }

    /** Transfiere la cuenta a otra mesa (los clientes se cambiaron de lugar). */
    public function transferir(Request $req, CuentaMesa $cuenta): JsonResponse
    {
        $this->authorize('manage', $cuenta);
        $data = $req->validate([
            'mesa_destino_id' => ['required', 'integer', Rule::exists('mesas', 'id')->where('local_id', $req->user()->local_id)],
        ]);
        $destino = Mesa::findOrFail($data['mesa_destino_id']);

        try {
            $cuenta = $this->cuentas->transferir($cuenta, $destino);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $cuenta]);
    }

    /** Une otra cuenta a esta (dos grupos que se juntan en una sola cuenta). */
    public function unir(Request $req, CuentaMesa $cuenta): JsonResponse
    {
        $this->authorize('manage', $cuenta);
        $data = $req->validate([
            'cuenta_origen_id' => ['required', 'integer', Rule::exists('cuentas_mesa', 'id')->where('local_id', $req->user()->local_id)],
        ]);
        $origen = CuentaMesa::findOrFail($data['cuenta_origen_id']);

        try {
            $cuenta = $this->cuentas->unir($cuenta, $origen);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $cuenta]);
    }

    public function preCuenta(CuentaMesa $cuenta): JsonResponse
    {
        $this->authorize('manage', $cuenta);

        try {
            $cuenta = $this->cuentas->marcarPreCuenta($cuenta);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $cuenta]);
    }

    public function aplicarGiftCard(Request $req, CuentaMesa $cuenta): JsonResponse
    {
        $this->authorize('manage', $cuenta);

        $data = $req->validate([
            'codigo' => ['required', 'string'],
            'monto' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $giftCard = GiftCard::query()
            ->where('codigo', strtoupper(trim($data['codigo'])))
            ->first();

        if (! $giftCard) {
            return response()->json(['message' => 'Gift card no encontrada.'], 404);
        }

        try {
            $cuenta = $this->cuentas->aplicarGiftCard(
                $cuenta, $giftCard, (float) ($data['monto'] ?? $giftCard->saldo), $this->giftCards
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $cuenta]);
    }

    public function cerrar(Request $req, CuentaMesa $cuenta): JsonResponse
    {
        $this->authorize('cerrar', $cuenta);

        $data = $req->validate([
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'pagos.*.metodo_pago' => ['required', 'in:efectivo,tarjeta_entrega,tarjeta_tpv,transferencia'],
            'pagos.*.pagado_por' => ['nullable', 'string', 'max:60'],
            'propina' => ['nullable', 'numeric', 'min:0'],
            // Corte de caja abierto que recibe el efectivo — para reconciliación real al cerrar el corte.
            'corte_caja_id' => ['nullable', 'integer', Rule::exists('cortes_caja', 'id')->where('local_id', $cuenta->local_id)->whereNull('cerrada_at')],
        ]);

        try {
            $cerrada = $this->cuentas->cerrar($cuenta, $data['pagos'], (float) ($data['propina'] ?? 0), $data['corte_caja_id'] ?? null);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $cerrada->load('pagos')]);
    }
}
