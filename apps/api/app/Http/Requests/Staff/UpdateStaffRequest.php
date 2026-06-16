<?php

namespace App\Http\Requests\Staff;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('staff'));
    }

    public function rules(): array
    {
        $staff = $this->route('staff');

        return [
            'nombre'                => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'email'                 => ['sometimes', 'required', 'email:rfc',
                Rule::unique('users', 'email')->ignore($staff?->id),
            ],
            // Password opcional al editar — sólo si owner quiere resetear.
            // `confirmed` mira password_confirmation pero no lo agrega al
            // `validated()` (evita escribirlo como columna de users).
            'password'              => ['sometimes', 'required', 'confirmed', Password::min(8)->letters()->numbers()],
            'permisos'              => ['sometimes', 'array'],
            'permisos.*'            => ['string', 'in:'.implode(',', User::MODULOS_VALIDOS)],
        ];
    }
}
