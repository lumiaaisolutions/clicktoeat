<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'action'         => $this->action,
            'resource_type'  => class_basename($this->resource_type),
            'resource_id'    => $this->resource_id,
            'changes'        => $this->changes,
            'ip'             => $this->ip,
            'actor'          => $this->whenLoaded('actor', fn () => $this->actor ? [
                'id'     => $this->actor->id,
                'nombre' => $this->actor->nombre,
                'rol'    => $this->actor->rol,
            ] : null),
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
