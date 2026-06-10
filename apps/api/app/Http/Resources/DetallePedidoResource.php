<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DetallePedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'producto_id'          => $this->producto_id,
            'producto_nombre'      => $this->producto_nombre,
            'precio_unitario'      => (float) $this->precio_unitario,
            'cantidad'             => (int) $this->cantidad,
            'subtotal'             => (float) $this->subtotal,
            'extras_seleccionados' => $this->extras_seleccionados ?? [],
            'notas'                => $this->notas,
        ];
    }
}
