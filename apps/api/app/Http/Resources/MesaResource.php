<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Salida controlada de una mesa. Expone `atiende` (nombre del mesero) sin
 * filtrar el objeto User completo (email, etc.). Ver docs/features/salon-roadmap.md (Fase A).
 */
class MesaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'piso_id' => $this->piso_id,
            'etiqueta' => $this->etiqueta,
            'pos_x' => $this->pos_x,
            'pos_y' => $this->pos_y,
            'estado' => $this->estado,
            'qr_token' => $this->qr_token,
            'atendido_por' => $this->atendido_por,
            'atiende' => $this->whenLoaded('mesero', fn () => $this->mesero?->nombre),
            'atendido_desde' => $this->atendido_desde?->toIso8601String(),
        ];
    }
}
