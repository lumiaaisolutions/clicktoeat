<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        $local = $this->route('local');

        return [
            'nombre'             => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'slug'               => ['sometimes', 'required', 'string', 'min:2', 'max:80', 'regex:/^[a-z0-9-]+$/',
                Rule::unique('locales', 'slug')->ignore($local?->id),
            ],
            'tagline'            => ['sometimes', 'nullable', 'string', 'max:200'],
            'logo_url'           => ['sometimes', 'nullable', 'url', 'max:500'],
            'banner_url'         => ['sometimes', 'nullable', 'url', 'max:500'],
            'color_primario'     => ['sometimes', 'required', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'color_secundario'   => ['sometimes', 'required', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'color_fondo'        => ['sometimes', 'required', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'tipografia'         => ['sometimes', 'required', 'string', 'max:60'],
            'dark_mode'          => ['sometimes', 'boolean'],
            'whatsapp'           => ['sometimes', 'required', 'string', 'min:10', 'max:20', 'regex:/^[0-9+]+$/'],
            'telefono'           => ['sometimes', 'nullable', 'string', 'max:20'],
            'email_contacto'     => ['sometimes', 'nullable', 'email:rfc'],
            'direccion'          => ['sometimes', 'nullable', 'string', 'max:300'],
            'delivery_fee'             => ['sometimes', 'numeric', 'min:0', 'max:9999'],
            'delivery_min_minutos'     => ['sometimes', 'integer', 'min:0', 'max:300'],
            'horarios'                 => ['sometimes', 'nullable', 'array', 'max:7'],
            'horarios.*.dia'           => ['required_with:horarios', 'in:lun,mar,mie,jue,vie,sab,dom'],
            'horarios.*.open'          => ['required_with:horarios', 'date_format:H:i'],
            'horarios.*.close'         => ['required_with:horarios', 'date_format:H:i'],
            'redes_sociales'           => ['sometimes', 'nullable', 'array'],
            'redes_sociales.ig'        => ['nullable', 'string', 'max:80'],
            'redes_sociales.fb'        => ['nullable', 'string', 'max:80'],
            'redes_sociales.tt'        => ['nullable', 'string', 'max:80'],
        ];
    }
}
