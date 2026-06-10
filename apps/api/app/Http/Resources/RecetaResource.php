<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecetaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'producto_id'            => $this->producto_id,
            'ingrediente_id'         => $this->ingrediente_id,
            'componente_producto_id' => $this->componente_producto_id,
            'cantidad'               => (float) $this->cantidad,
            'tipo'                   => $this->ingrediente_id ? 'ingrediente' : 'componente',
            'ingrediente'            => $this->whenLoaded('ingrediente', fn () => $this->ingrediente ? [
                'id'     => $this->ingrediente->id,
                'nombre' => $this->ingrediente->nombre,
                'unidad' => $this->ingrediente->unidad,
                'stock'  => (float) $this->ingrediente->stock,
            ] : null),
            'componente'             => $this->whenLoaded('componente', fn () => $this->componente ? [
                'id'     => $this->componente->id,
                'nombre' => $this->componente->nombre,
                'slug'   => $this->componente->slug,
            ] : null),
        ];
    }
}
