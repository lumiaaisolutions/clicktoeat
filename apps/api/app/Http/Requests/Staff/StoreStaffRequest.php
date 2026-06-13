<?php

namespace App\Http\Requests\Staff;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    public function rules(): array
    {
        return [
            'nombre'                => ['required', 'string', 'min:2', 'max:120'],
            'email'                 => ['required', 'email:rfc', 'unique:users,email'],
            'password'              => ['required', Password::min(8)->letters()->numbers()],
            'password_confirmation' => ['sometimes'],
            'permisos'              => ['sometimes', 'array'],
            'permisos.*'            => ['string', 'in:'.implode(',', User::MODULOS_VALIDOS)],
        ];
    }
}
