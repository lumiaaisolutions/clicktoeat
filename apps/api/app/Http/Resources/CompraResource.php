<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'codigo'             => $this->codigo,
            'local_id'           => $this->local_id,
            'proveedor'          => $this->proveedor,
            'referencia_factura' => $this->referencia_factura,
            'fecha'              => $this->fecha?->toDateString(),
            'subtotal'           => (float) $this->subtotal,
            'impuestos'          => (float) $this->impuestos,
            'total'              => (float) $this->total,
            'notas'              => $this->notas,
            'estado'             => $this->estado,
            'detalles'           => DetalleCompraResource::collection($this->whenLoaded('detalles')),
            'usuario'            => $this->whenLoaded('usuario', fn () => $this->usuario ? [
                'id'     => $this->usuario->id,
                'nombre' => $this->usuario->nombre,
            ] : null),
            'created_at'         => $this->created_at?->toIso8601String(),
        ];
    }
}
