<?php

namespace App\Http\Requests\ToppingGroup;

use App\Models\ToppingGroup;
use Illuminate\Foundation\Http\FormRequest;

class StoreToppingGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', ToppingGroup::class);
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'min:1', 'max:80'],
            'kind' => ['required', 'in:one,many'],
            'required' => ['nullable', 'boolean'],
            'activo' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.name' => ['required', 'string', 'max:60'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
