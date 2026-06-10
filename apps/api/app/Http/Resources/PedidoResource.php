<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'codigo'         => $this->codigo,
            'local_id'       => $this->local_id,
            'cliente_nombre'   => $this->cliente_nombre,
            'cliente_telefono' => $this->cliente_telefono,
            'direccion'      => $this->direccion,
            'notas'          => $this->notas,
            'metodo_entrega' => $this->metodo_entrega,
            'metodo_pago'    => $this->metodo_pago,
            'subtotal'       => (float) $this->subtotal,
            'delivery_fee'   => (float) $this->delivery_fee,
            'descuento'      => (float) $this->descuento,
            'total'          => (float) $this->total,
            'estado'         => $this->estado,
            'whatsapp_url'   => $this->whatsapp_url,
            'detalles'       => DetallePedidoResource::collection($this->whenLoaded('detalles')),
            'confirmado_at'  => $this->confirmado_at?->toIso8601String(),
            'entregado_at'   => $this->entregado_at?->toIso8601String(),
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),
        ];
    }
}
