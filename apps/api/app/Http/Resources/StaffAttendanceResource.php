<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffAttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'nombre' => $this->user->nombre,
            ]),
            'entrada' => $this->entrada,
            'salida' => $this->salida,
            'horas' => $this->salida ? round($this->entrada->diffInMinutes($this->salida) / 60, 2) : null,
            'notas' => $this->notas,
        ];
    }
}
