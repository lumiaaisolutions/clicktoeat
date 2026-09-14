<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Alta self-service de sucursal. El gate de plan (Premium) lo hace el middleware
 * `feature:sucursales_consolidadas` en la ruta; aquí validamos rol e input. El
 * límite por plan (`max_sucursales`) se verifica en el controller (necesita query).
 */
class StoreSucursalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        // Solo el owner (o super_admin) da de alta sucursales; el staff no.
        return $user !== null && ($user->isOwner() || $user->isSuperAdmin());
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'alpha_dash', 'max:120', 'unique:locales,slug'],
            'whatsapp' => ['required', 'string', 'max:20'],
            'email_contacto' => ['nullable', 'email', 'max:191'],
            'direccion' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre de la sucursal es obligatorio.',
            'whatsapp.required' => 'El WhatsApp de la sucursal es obligatorio.',
            'slug.unique' => 'Ese enlace (slug) ya está en uso, elige otro.',
            'slug.alpha_dash' => 'El enlace solo puede tener letras, números, guiones y guiones bajos.',
        ];
    }
}
