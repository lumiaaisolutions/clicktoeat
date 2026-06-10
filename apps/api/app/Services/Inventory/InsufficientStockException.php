<?php

namespace App\Services\Inventory;

use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    /** @param array<int, array{ingrediente: string, requerido: float, disponible: float, unidad: string}> $faltantes */
    public function __construct(public readonly array $faltantes)
    {
        parent::__construct('Stock insuficiente: '.implode(', ', array_map(
            fn ($f) => "{$f['ingrediente']} (necesario {$f['requerido']}{$f['unidad']}, hay {$f['disponible']}{$f['unidad']})",
            $faltantes,
        )));
    }
}
