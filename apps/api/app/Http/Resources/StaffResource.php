<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'nombre'             => $this->nombre,
            'email'              => $this->email,
            'rol'                => $this->rol,
            'local_id'           => $this->local_id,
            'email_verified_at'  => $this->email_verified_at?->toIso8601String(),
            'last_token_used_at' => $this->whenLoaded('tokens', fn () => $this->tokens->max('last_used_at')?->toIso8601String()),
            'created_at'         => $this->created_at?->toIso8601String(),
            'updated_at'         => $this->updated_at?->toIso8601String(),
        ];
    }
}
