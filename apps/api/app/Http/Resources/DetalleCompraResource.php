<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DetalleCompraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'ingrediente_id' => $this->ingrediente_id,
            'cantidad'       => (float) $this->cantidad,
            'costo_unitario' => (float) $this->costo_unitario,
            'subtotal'       => (float) $this->subtotal,
            'ingrediente'    => $this->whenLoaded('ingrediente', fn () => $this->ingrediente ? [
                'id'     => $this->ingrediente->id,
                'nombre' => $this->ingrediente->nombre,
                'unidad' => $this->ingrediente->unidad,
            ] : null),
        ];
    }
}
