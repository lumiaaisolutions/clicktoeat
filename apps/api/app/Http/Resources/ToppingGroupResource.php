<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToppingGroupResource extends JsonResource
{
    /** Mapa ingrediente_id => stock, inyectado por el controller para calcular disponibilidad sin N+1. */
    public static array $stock = [];

    public function toArray(Request $request): array
    {
        $items = collect($this->items ?? [])->map(function (array $it) {
            $disponible = true;
            foreach (($it['receta'] ?? []) as $r) {
                $stock = self::$stock[$r['ingrediente_id']] ?? 0.0;
                if ($stock < (float) $r['cantidad']) {
                    $disponible = false;
                    break;
                }
            }

            return $it + ['disponible' => $disponible];
        })->all();

        return [
            'id' => $this->id,
            'local_id' => $this->local_id,
            'nombre' => $this->nombre,
            'kind' => $this->kind,
            'required' => (bool) $this->required,
            'items' => $items,
            'activo' => (bool) $this->activo,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
