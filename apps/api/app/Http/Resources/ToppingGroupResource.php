<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToppingGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'local_id' => $this->local_id,
            'nombre' => $this->nombre,
            'kind' => $this->kind,
            'required' => (bool) $this->required,
            'items' => $this->items ?? [],
            'activo' => (bool) $this->activo,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
