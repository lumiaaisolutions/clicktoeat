<?php

namespace App\Services\Salon;

use App\Models\GiftCard;
use App\Models\Local;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class GiftCardService
{
    public function emitir(Local $local, float $monto, ?string $compradorEmail = null): GiftCard
    {
        return DB::transaction(function () use ($local, $monto, $compradorEmail) {
            $giftCard = GiftCard::create([
                'local_id' => $local->id,
                'codigo' => $this->generarCodigo(),
                'monto_inicial' => $monto,
                'saldo' => $monto,
                'comprador_email' => $compradorEmail,
                'estado' => 'activa',
            ]);

            $giftCard->movimientos()->create([
                'local_id' => $local->id,
                'tipo' => 'emision',
                'monto' => $monto,
            ]);

            return $giftCard;
        });
    }

    /** Idempotente por pedido — redimir dos veces el mismo pedido no descuenta doble. */
    public function redimir(GiftCard $giftCard, float $monto, Pedido $pedido): GiftCard
    {
        return DB::transaction(function () use ($giftCard, $monto, $pedido) {
            $giftCard = GiftCard::query()->where('id', $giftCard->id)->lockForUpdate()->firstOrFail();

            $yaRedimida = $giftCard->movimientos()
                ->where('pedido_id', $pedido->id)
                ->where('tipo', 'redencion')
                ->exists();
            if ($yaRedimida) {
                return $giftCard;
            }

            if ($giftCard->estado !== 'activa') {
                throw new RuntimeException('La gift card no está activa.');
            }
            if ((float) $giftCard->saldo < $monto) {
                throw new RuntimeException('Saldo insuficiente en la gift card.');
            }

            $nuevoSaldo = round((float) $giftCard->saldo - $monto, 2);
            $giftCard->update([
                'saldo' => $nuevoSaldo,
                'estado' => $nuevoSaldo <= 0 ? 'agotada' : 'activa',
            ]);

            $giftCard->movimientos()->create([
                'local_id' => $giftCard->local_id,
                'tipo' => 'redencion',
                'monto' => $monto,
                'pedido_id' => $pedido->id,
            ]);

            return $giftCard->fresh();
        });
    }

    private function generarCodigo(): string
    {
        do {
            $codigo = 'GC-'.strtoupper(Str::random(8));
        } while (GiftCard::withoutGlobalScopes()->where('codigo', $codigo)->exists());

        return $codigo;
    }
}
