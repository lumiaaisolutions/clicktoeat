<?php

namespace App\Exceptions;

use Exception;

/**
 * Excepción lanzada cuando un local intenta crear un recurso que excede
 * el límite cuantitativo de su plan (max_productos, max_categorias, max_staff).
 *
 * Se renderiza como JSON 402 desde `bootstrap/app.php`.
 */
class PlanLimitException extends Exception
{
    public function __construct(
        public readonly string $feature,
        public readonly int $limit,
        public readonly int $current,
    ) {
        parent::__construct("Alcanzaste el límite de tu plan ({$limit} {$feature}).");
    }
}
