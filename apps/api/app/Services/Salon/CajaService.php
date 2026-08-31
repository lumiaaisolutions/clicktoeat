<?php

namespace App\Services\Salon;

use App\Models\Caja;
use App\Models\CorteCaja;
use App\Models\MovimientoCaja;
use App\Models\PagoCuentaMesa;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Apertura/cierre de caja física + movimientos manuales.
 *
 * `monto_esperado` = monto_inicial + fondos + efectivo real recibido
 * (pagos_cuenta_mesa con metodo_pago=efectivo asociados a este corte, ver
 * CuentaMesaService::cerrar) - retiros - vales. Requiere que el cajero pase
 * el `corte_caja_id` al cerrar cada cuenta de mesa — si no lo pasa, esos
 * pagos en efectivo quedan sin asociar y no entran en la reconciliación
 * (se reportan aparte, no se pierden).
 */
class CajaService
{
    public function abrirCorte(Caja $caja, User $user, float $montoInicial): CorteCaja
    {
        $abierto = CorteCaja::query()
            ->where('caja_id', $caja->id)
            ->whereNull('cerrada_at')
            ->first();

        if ($abierto) {
            throw new RuntimeException('Esta caja ya tiene un corte abierto.');
        }

        return CorteCaja::create([
            'local_id' => $caja->local_id,
            'caja_id' => $caja->id,
            'abierto_por' => $user->id,
            'monto_inicial' => $montoInicial,
            'abierta_at' => now(),
        ]);
    }

    public function agregarMovimiento(CorteCaja $corte, string $tipo, float $monto, ?string $motivo, User $user): MovimientoCaja
    {
        if ($corte->cerrada_at !== null) {
            throw new RuntimeException('No se pueden agregar movimientos a un corte cerrado.');
        }

        return MovimientoCaja::create([
            'local_id' => $corte->local_id,
            'corte_caja_id' => $corte->id,
            'tipo' => $tipo,
            'monto' => $monto,
            'motivo' => $motivo,
            'user_id' => $user->id,
        ]);
    }

    /**
     * Cobra un pedido de mostrador (no ligado a una cuenta de mesa). "Todo pasa
     * por caja": Venta arma el pedido sin cobrar y Caja lo cobra. Pago único
     * (sin split — el split/mixto vive en las cuentas de mesa). El efectivo se
     * liga al corte para la reconciliación (gap #6).
     */
    public function cobrarPedido(Pedido $pedido, string $metodoPago, ?int $corteCajaId = null): Pedido
    {
        if ($pedido->cuenta_mesa_id !== null) {
            throw new RuntimeException('Este pedido pertenece a una cuenta de mesa; cóbralo cerrando la cuenta.');
        }
        if ($pedido->estado === 'cancelado') {
            throw new RuntimeException('No se puede cobrar un pedido cancelado.');
        }
        if ($pedido->estado_pago === 'pagado') {
            throw new RuntimeException('Este pedido ya está cobrado.');
        }

        return DB::transaction(function () use ($pedido, $metodoPago, $corteCajaId) {
            $pedido->update([
                'estado_pago' => 'pagado',
                'metodo_pago' => $metodoPago,
                'pagado_at' => now(),
                // Solo el efectivo mueve dinero físico de la caja.
                'corte_caja_id' => $metodoPago === 'efectivo' ? $corteCajaId : null,
            ]);

            return $pedido->fresh();
        });
    }

    public function cerrarCorte(CorteCaja $corte, User $user, float $montoContado): CorteCaja
    {
        if ($corte->cerrada_at !== null) {
            throw new RuntimeException('El corte ya está cerrado.');
        }

        return DB::transaction(function () use ($corte, $user, $montoContado) {
            $fondos = (float) $corte->movimientos()->where('tipo', 'fondo')->sum('monto');
            $retiros = (float) $corte->movimientos()->where('tipo', 'retiro')->sum('monto');
            $vales = (float) $corte->movimientos()->where('tipo', 'vale')->sum('monto');
            $efectivoRecibido = (float) PagoCuentaMesa::query()
                ->where('corte_caja_id', $corte->id)
                ->where('metodo_pago', 'efectivo')
                ->sum('monto');

            // Efectivo de pedidos de mostrador cobrados en este corte (gap #6).
            $efectivoMostrador = (float) Pedido::query()
                ->where('corte_caja_id', $corte->id)
                ->where('metodo_pago', 'efectivo')
                ->where('estado_pago', 'pagado')
                ->sum('total');

            $montoEsperado = (float) $corte->monto_inicial + $fondos + $efectivoRecibido + $efectivoMostrador - $retiros - $vales;
            $varianza = round($montoContado - $montoEsperado, 2);

            $corte->update([
                'cerrado_por' => $user->id,
                'monto_esperado' => $montoEsperado,
                'monto_contado' => $montoContado,
                'varianza' => $varianza,
                'cerrada_at' => now(),
            ]);

            return $corte->fresh();
        });
    }
}
