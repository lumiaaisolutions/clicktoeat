<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterMobileDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'expo_push_token' => ['required', 'string', 'max:200'],
            'platform'        => ['required', 'in:ios,android'],
            'device_name'     => ['nullable', 'string', 'max:120'],
            'app_version'     => ['nullable', 'string', 'max:32'],
        ];
    }
}
