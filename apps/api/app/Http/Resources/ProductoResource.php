<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'local_id'     => $this->local_id,
            'categoria_id' => $this->categoria_id,
            'nombre'       => $this->nombre,
            'slug'         => $this->slug,
            'descripcion'  => $this->descripcion,
            'precio'       => (float) $this->precio,
            'precio_descuento' => $this->precio_descuento !== null ? (float) $this->precio_descuento : null,
            'imagen_url'   => $this->imagen_url,
            'imagen_public_id' => $this->imagen_public_id,
            'disponible'   => (bool) $this->disponible,
            'es_combo'     => (bool) $this->es_combo,
            'es_promocion' => (bool) $this->es_promocion,
            'tag'          => $this->tag,
            'orden'        => (int) $this->orden,
            'extras'       => $this->extras ?? [],
            'categoria'    => $this->whenLoaded('categoria', fn () => [
                'id'     => $this->categoria->id,
                'slug'   => $this->categoria->slug,
                'nombre' => $this->categoria->nombre,
            ]),
            'created_at'   => $this->created_at?->toIso8601String(),
            'updated_at'   => $this->updated_at?->toIso8601String(),
        ];
    }
}
