<?php

namespace App\Http\Resources\Public;

use App\Support\HorarioCalculator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'slug'             => $this->slug,
            'nombre'           => $this->nombre,
            'tagline'          => $this->tagline,
            'logo'             => $this->logo_url,
            'banner'           => $this->banner_url,
            'colorPrimario'    => $this->color_primario,
            'colorSecundario'  => $this->color_secundario,
            'direccion'        => $this->direccion,
            'whatsapp'         => $this->whatsapp,
            'horarios'         => $this->horarios,
            'estado'           => HorarioCalculator::estado($this->resource),
            'deliveryFee'      => (float) $this->delivery_fee,
            'deliveryMinutos'  => (int) $this->delivery_min_minutos,
            'deliveryRadioKm'  => (int) ($this->delivery_radio_km ?? 5),
            'lat'              => $this->lat !== null ? (float) $this->lat : null,
            'lng'              => $this->lng !== null ? (float) $this->lng : null,
            'redesSociales'    => $this->redes_sociales,
            'productosCount'   => $this->whenCounted('productos'),
        ];
    }
}
