<?php

namespace App\Services\Compras;

use RuntimeException;

class CompraNoReversibleException extends RuntimeException
{
    /** @param array<int, array{ingrediente: string, comprado: float, stock_actual: float, unidad: string}> $faltantes */
    public function __construct(string $message, public readonly array $faltantes)
    {
        parent::__construct($message);
    }
}
