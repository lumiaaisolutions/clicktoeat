<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovimientoInventarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'ingrediente_id'   => $this->ingrediente_id,
            'tipo'             => $this->tipo,
            'cantidad'         => (float) $this->cantidad,
            'stock_resultante' => (float) $this->stock_resultante,
            'referencia'       => $this->referencia,
            'motivo'           => $this->motivo,
            'usuario'          => $this->whenLoaded('usuario', fn () => $this->usuario ? [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->nombre,
            ] : null),
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
