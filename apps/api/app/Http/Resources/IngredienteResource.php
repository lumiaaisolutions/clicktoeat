<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IngredienteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'local_id'       => $this->local_id,
            'nombre'         => $this->nombre,
            'stock'          => (float) $this->stock,
            'stock_minimo'   => (float) $this->stock_minimo,
            'unidad'         => $this->unidad,
            'costo_unitario' => (float) $this->costo_unitario,
            'activo'         => (bool) $this->activo,
            'bajo_stock'     => (float) $this->stock <= (float) $this->stock_minimo,
            'recetas_count'  => $this->whenCounted('recetas'),
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),
        ];
    }
}
