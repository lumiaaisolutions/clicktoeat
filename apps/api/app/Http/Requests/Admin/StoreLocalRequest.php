<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class StoreLocalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            // Local
            'nombre'           => ['required', 'string', 'min:2', 'max:120'],
            'slug'             => ['nullable', 'string', 'min:2', 'max:80', 'regex:/^[a-z0-9-]+$/', 'unique:locales,slug'],
            'tagline'          => ['nullable', 'string', 'max:200'],
            'whatsapp'         => ['required', 'string', 'min:10', 'max:20', 'regex:/^[0-9+]+$/'],
            'telefono'         => ['nullable', 'string', 'max:20'],
            'email_contacto'   => ['nullable', 'email:rfc'],
            'direccion'        => ['nullable', 'string', 'max:300'],

            // Branding (con defaults si no llegan)
            'color_primario'   => ['nullable', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'color_secundario' => ['nullable', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'color_fondo'      => ['nullable', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/'],
            'tipografia'       => ['nullable', 'string', 'max:60'],

            // Operación
            'delivery_fee'             => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'delivery_min_minutos'     => ['nullable', 'integer', 'min:0', 'max:300'],

            // Owner — opcional, si no se pasa se crea sin owner asignado todavía
            'owner'                 => ['nullable', 'array'],
            'owner.nombre'          => ['required_with:owner', 'string', 'min:2', 'max:120'],
            'owner.email'           => ['required_with:owner', 'email:rfc', 'unique:users,email'],
            'owner.password'        => ['required_with:owner', 'confirmed', Password::min(8)],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('nombre')) {
            $this->merge(['slug' => Str::slug($this->input('nombre'))]);
        }
    }
}
