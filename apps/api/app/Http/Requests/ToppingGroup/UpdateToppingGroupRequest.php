<?php

namespace App\Http\Requests\ToppingGroup;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateToppingGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('topping'));
    }

    public function rules(): array
    {
        return [
            'nombre' => ['sometimes', 'required', 'string', 'min:1', 'max:80'],
            'kind' => ['sometimes', 'required', 'in:one,many'],
            'required' => ['sometimes', 'boolean'],
            'activo' => ['sometimes', 'boolean'],
            'items' => ['sometimes', 'required', 'array', 'min:1', 'max:50'],
            'items.*.name' => ['required', 'string', 'max:60'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.receta' => ['nullable', 'array', 'max:20'],
            'items.*.receta.*.ingrediente_id' => ['required', 'integer',
                Rule::exists('ingredientes', 'id')->where('local_id', $this->user()->local_id)],
            'items.*.receta.*.cantidad' => ['required', 'numeric', 'min:0.001'],
        ];
    }
}
