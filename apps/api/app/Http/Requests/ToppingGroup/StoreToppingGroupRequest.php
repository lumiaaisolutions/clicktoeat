<?php

namespace App\Http\Requests\ToppingGroup;

use App\Models\ToppingGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'incluidos' => ['nullable', 'integer', 'min:0', 'max:50'],
            'maximo' => ['nullable', 'integer', 'min:1', 'max:50'],
            'activo' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.name' => ['required', 'string', 'max:60'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.receta' => ['nullable', 'array', 'max:20'],
            'items.*.receta.*.ingrediente_id' => ['required', 'integer',
                Rule::exists('ingredientes', 'id')->where('local_id', $this->user()->local_id)],
            'items.*.receta.*.cantidad' => ['required', 'numeric', 'min:0.001'],
        ];
    }
}
