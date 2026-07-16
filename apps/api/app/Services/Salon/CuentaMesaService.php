<?php

namespace App\Services\Salon;

use App\Models\CuentaMesa;
use App\Models\GiftCard;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\PropinaReparto;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Cuenta de mesa: agrupa N pedidos de una misma mesa para split bill / pago
 * mixto / pre-cuenta. Ver docs/features/plan-499-operacion-salon-implementacion.md §3.3.
 *
 * Tip pooling v1: reparte por rol usando `locales.reglas_propina` dividido
 * en partes iguales entre el staff que tenga ese permiso — NO rastrea quién
 * atendió específicamente la mesa (eso requeriría asignación de mesero por
 * turno, fuera de alcance v1). Ver nota legal en ADR-012 §3.5 antes de
 * repartir dinero real, no sólo calcularlo.
 */
class CuentaMesaService
{
    /** Devuelve la cuenta abierta de la mesa, o crea una nueva. */
    public function abrirParaMesa(Mesa $mesa): CuentaMesa
    {
        return DB::transaction(function () use ($mesa) {
            $abierta = CuentaMesa::query()
                ->where('mesa_id', $mesa->id)
                ->where('estado', 'abierta')
                ->lockForUpdate()
                ->first();

            if ($abierta) {
                return $abierta;
            }

            $cuenta = CuentaMesa::create([
                'local_id' => $mesa->local_id,
                'mesa_id' => $mesa->id,
                'estado' => 'abierta',
            ]);

            $mesa->update(['estado' => 'ocupada']);

            return $cuenta;
        });
    }

    /** Adjunta un pedido recién creado a la cuenta abierta de su mesa. */
    public function adjuntarPedido(CuentaMesa $cuenta, Pedido $pedido): void
    {
        DB::transaction(function () use ($cuenta, $pedido) {
            $pedido->update(['cuenta_mesa_id' => $cuenta->id]);
            $this->recalcular($cuenta);
        });
    }

    public function marcarPreCuenta(CuentaMesa $cuenta): CuentaMesa
    {
        return DB::transaction(function () use ($cuenta) {
            $this->recalcular($cuenta);
            $cuenta->update(['estado' => 'pre_cuenta']);
            $cuenta->mesa->update(['estado' => 'por_cobrar']);

            return $cuenta->fresh();
        });
    }

    private function recalcular(CuentaMesa $cuenta): void
    {
        $subtotal = $cuenta->pedidos()->where('estado', '!=', 'cancelado')->sum('total');
        $porCobrar = max(0, $subtotal - (float) $cuenta->descuento_gift_card);
        $cuenta->update(['subtotal' => $subtotal, 'total' => $porCobrar + $cuenta->propina_total]);
    }

    /**
     * Aplica saldo de una gift card como descuento a la cuenta (no a un
     * pedido individual — una cuenta puede agrupar varios pedidos). Usa el
     * primer pedido de la cuenta como ancla de idempotencia en
     * `GiftCardService::redimir` (una cuenta ya tiene siempre al menos un
     * pedido cuando existe, ver `abrirParaMesa`/`adjuntarPedido`).
     */
    public function aplicarGiftCard(CuentaMesa $cuenta, GiftCard $giftCard, float $monto, GiftCardService $giftCards): CuentaMesa
    {
        if ($cuenta->estado === 'cerrada') {
            throw new RuntimeException('La cuenta ya está cerrada.');
        }
        if ($cuenta->gift_card_id !== null) {
            throw new RuntimeException('Esta cuenta ya tiene una gift card aplicada.');
        }

        $this->recalcular($cuenta);
        $cuenta->refresh();

        $montoAplicable = min($monto, (float) $giftCard->saldo, (float) $cuenta->subtotal);
        if ($montoAplicable <= 0) {
            throw new RuntimeException('No hay saldo o subtotal disponible para aplicar la gift card.');
        }

        $primerPedido = $cuenta->pedidos()->orderBy('id')->firstOrFail();

        return DB::transaction(function () use ($cuenta, $giftCard, $montoAplicable, $primerPedido, $giftCards) {
            $giftCards->redimir($giftCard, $montoAplicable, $primerPedido);

            $cuenta->update(['gift_card_id' => $giftCard->id, 'descuento_gift_card' => $montoAplicable]);
            $this->recalcular($cuenta);

            return $cuenta->fresh();
        });
    }

    /**
     * Cierra la cuenta: valida que la suma de pagos cubra subtotal+propina
     * (split bill / pago mixto = múltiples filas en $pagos), registra los
     * pagos, libera la mesa y reparte propina por rol si aplica.
     *
     * @param  array<int, array{monto:float, metodo_pago:string, pagado_por?:?string}>  $pagos
     */
    public function cerrar(CuentaMesa $cuenta, array $pagos, float $propina = 0.0, ?int $corteCajaId = null): CuentaMesa
    {
        if ($cuenta->estado === 'cerrada') {
            throw new RuntimeException('La cuenta ya está cerrada.');
        }

        $this->recalcular($cuenta);
        $cuenta->refresh();

        $totalEsperado = round((float) $cuenta->subtotal - (float) $cuenta->descuento_gift_card + $propina, 2);
        $totalPagado = round(array_sum(array_column($pagos, 'monto')), 2);

        if (abs($totalEsperado - $totalPagado) > 0.01) {
            throw new RuntimeException(
                "Los pagos (\${$totalPagado}) no cubren el total de la cuenta (\${$totalEsperado})."
            );
        }

        return DB::transaction(function () use ($cuenta, $pagos, $propina, $corteCajaId) {
            foreach ($pagos as $pago) {
                $cuenta->pagos()->create([
                    'local_id' => $cuenta->local_id,
                    // Sólo asociamos el corte si el pago es en efectivo — tarjeta/transferencia
                    // no mueven dinero físico de la caja, no deben afectar la reconciliación.
                    'corte_caja_id' => $pago['metodo_pago'] === 'efectivo' ? $corteCajaId : null,
                    'monto' => $pago['monto'],
                    'metodo_pago' => $pago['metodo_pago'],
                    'pagado_por' => $pago['pagado_por'] ?? null,
                ]);
            }

            $cuenta->update([
                'estado' => 'cerrada',
                'propina_total' => $propina,
                'total' => (float) $cuenta->subtotal - (float) $cuenta->descuento_gift_card + $propina,
                'cerrada_at' => now(),
            ]);

            $cuenta->mesa->update(['estado' => 'libre']);

            if ($propina > 0) {
                $this->repartirPropina($cuenta, $propina);
            }

            return $cuenta->fresh();
        });
    }

    private function repartirPropina(CuentaMesa $cuenta, float $propina): void
    {
        $local = Local::withoutGlobalScopes()->find($cuenta->local_id);
        $reglas = $local?->reglas_propina;
        if (empty($reglas)) {
            return;
        }

        foreach ($reglas as $rol => $porcentaje) {
            $montoRol = round($propina * ((float) $porcentaje / 100), 2);
            if ($montoRol <= 0) {
                continue;
            }

            $staff = User::query()->withoutGlobalScopes()
                ->where('local_id', $cuenta->local_id)
                ->where('rol', 'staff')
                ->get()
                ->filter(fn (User $u) => $u->puedeAcceder($rol));

            if ($staff->isEmpty()) {
                continue; // nadie tiene ese rol asignado — queda sin repartir (gap v1 documentado)
            }

            $montoPorPersona = round($montoRol / $staff->count(), 2);
            foreach ($staff as $user) {
                PropinaReparto::create([
                    'local_id' => $cuenta->local_id,
                    'cuenta_mesa_id' => $cuenta->id,
                    'user_id' => $user->id,
                    'rol' => $rol,
                    'monto' => $montoPorPersona,
                ]);
            }
        }
    }
}
