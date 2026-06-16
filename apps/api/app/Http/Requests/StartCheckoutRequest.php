<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;  // endpoint público para empezar checkout
    }

    public function rules(): array
    {
        return [
            'plan_slug' => ['required', 'string', 'in:essential,professional,premium'],
            'email'     => ['nullable', 'email'],   // pre-llena el campo email del checkout si viene
        ];
    }
}
