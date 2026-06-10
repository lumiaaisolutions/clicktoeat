<?php

namespace App\Http\Requests\Categoria;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreCategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Categoria::class);
    }

    public function rules(): array
    {
        $localId = $this->user()->local_id;

        return [
            'nombre' => ['required', 'string', 'min:1', 'max:80'],
            'slug'   => ['nullable', 'string', 'max:80',
                Rule::unique('categorias', 'slug')->where('local_id', $localId),
            ],
            'icono'  => ['nullable', 'string', 'max:60'],
            'orden'  => ['nullable', 'integer', 'min:0', 'max:9999'],
            'activo' => ['nullable', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('nombre')) {
            $this->merge(['slug' => Str::slug($this->input('nombre'))]);
        }
    }
}
