<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificacionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'tipo'       => $this->tipo,
            'titulo'     => $this->titulo,
            'mensaje'    => $this->mensaje,
            'data'       => $this->data,
            'leida'      => $this->leida_at !== null,
            'leida_at'   => $this->leida_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
