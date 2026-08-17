<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AskClickyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:400'],
            'pathname' => ['nullable', 'string', 'max:200'],
        ];
    }
}
