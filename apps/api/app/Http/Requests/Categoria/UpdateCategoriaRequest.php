<?php

namespace App\Http\Requests\Categoria;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateCategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('categoria'));
    }

    public function rules(): array
    {
        $categoria = $this->route('categoria');
        $localId   = $this->user()->local_id;

        return [
            'nombre' => ['sometimes', 'required', 'string', 'min:1', 'max:80'],
            'slug'   => ['sometimes', 'required', 'string', 'max:80',
                Rule::unique('categorias', 'slug')
                    ->where('local_id', $localId)
                    ->ignore($categoria?->id),
            ],
            'icono'  => ['sometimes', 'nullable', 'string', 'max:60'],
            'orden'  => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('slug')) {
            $this->merge(['slug' => Str::slug($this->input('slug'))]);
        }
    }
}
