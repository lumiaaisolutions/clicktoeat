<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email:rfc'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
            'otp'      => ['nullable', 'string', 'max:20'],
            'device'   => ['nullable', 'string', 'max:120'],
        ];
    }
}
