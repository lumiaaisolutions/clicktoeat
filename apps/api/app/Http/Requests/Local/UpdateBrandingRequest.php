<?php

namespace App\Http\Requests\Local;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBrandingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('local') ?? $this->user()->local);
    }

    public function rules(): array
    {
        return [
            // Identidad
            'nombre'             => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'tagline'            => ['sometimes', 'nullable', 'string', 'max:200'],

            // Branding
            'logo_url'           => ['sometimes', 'nullable', 'url', 'max:500'],
            'banner_url'         => ['sometimes', 'nullable', 'url', 'max:500'],
            'color_primario'     => ['sometimes', 'required', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'color_secundario'   => ['sometimes', 'required', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'color_fondo'        => ['sometimes', 'required', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'tipografia'         => ['sometimes', 'required', 'string', 'max:60'],
            'dark_mode'          => ['sometimes', 'boolean'],

            // Contacto
            'whatsapp'           => ['sometimes', 'required', 'string', 'min:10', 'max:20', 'regex:/^[0-9+]+$/'],
            'telefono'           => ['sometimes', 'nullable', 'string', 'max:20'],
            'email_contacto'     => ['sometimes', 'nullable', 'email:rfc'],
            'direccion'          => ['sometimes', 'nullable', 'string', 'max:300'],
            'lat'                => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng'                => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],

            // Operación
            'horarios'                 => ['sometimes', 'nullable', 'array', 'max:7'],
            'horarios.*.dia'           => ['required_with:horarios', 'in:lun,mar,mie,jue,vie,sab,dom'],
            'horarios.*.open'          => ['required_with:horarios', 'date_format:H:i'],
            'horarios.*.close'         => ['required_with:horarios', 'date_format:H:i'],
            'delivery_fee'             => ['sometimes', 'numeric', 'min:0', 'max:9999'],
            'delivery_min_minutos'     => ['sometimes', 'integer', 'min:0', 'max:300'],
            'delivery_radio_km'        => ['sometimes', 'integer', 'min:1', 'max:200'],
            'zona_entrega'             => ['sometimes', 'nullable', 'array'],

            // Pagos
            'metodos_pago'             => ['sometimes', 'nullable', 'array'],
            'metodos_pago.*'           => ['string', 'in:efectivo,tarjeta_entrega,transferencia'],

            // Redes
            'redes_sociales'           => ['sometimes', 'nullable', 'array'],
            'redes_sociales.ig'        => ['nullable', 'string', 'max:255'],
            'redes_sociales.fb'        => ['nullable', 'string', 'max:255'],
            'redes_sociales.tt'        => ['nullable', 'string', 'max:255'],
            'redes_sociales.wapp'      => ['nullable', 'string', 'max:255'],
        ];
    }
}
