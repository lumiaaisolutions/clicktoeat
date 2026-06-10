<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'nombre'               => $this->nombre,
            'slug'                 => $this->slug,
            'tagline'              => $this->tagline,
            'logo_url'             => $this->logo_url,
            'banner_url'           => $this->banner_url,
            'color_primario'       => $this->color_primario,
            'color_secundario'     => $this->color_secundario,
            'color_fondo'          => $this->color_fondo,
            'tipografia'           => $this->tipografia,
            'dark_mode'            => (bool) $this->dark_mode,
            'whatsapp'             => $this->whatsapp,
            'telefono'             => $this->telefono,
            'email_contacto'       => $this->email_contacto,
            'direccion'            => $this->direccion,
            'lat'                  => $this->lat !== null ? (float) $this->lat : null,
            'lng'                  => $this->lng !== null ? (float) $this->lng : null,
            'horarios'             => $this->horarios,
            'zona_entrega'         => $this->zona_entrega,
            'delivery_fee'         => (float) $this->delivery_fee,
            'delivery_min_minutos' => (int) $this->delivery_min_minutos,
            'delivery_radio_km'    => (int) ($this->delivery_radio_km ?? 5),
            'redes_sociales'       => $this->redes_sociales,
            'metodos_pago'         => $this->metodos_pago ?? ['efectivo', 'tarjeta_entrega', 'transferencia'],
            'activo'               => (bool) $this->activo,
            'suspendido'           => (bool) $this->suspendido,
            'modulos'              => $this->modulos,
            'public_url'           => rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').'/'.$this->slug,
            'created_at'           => $this->created_at?->toIso8601String(),
            'updated_at'           => $this->updated_at?->toIso8601String(),
        ];
    }
}
