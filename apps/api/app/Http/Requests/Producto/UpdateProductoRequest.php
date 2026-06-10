<?php

namespace App\Http\Requests\Producto;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('producto'));
    }

    public function rules(): array
    {
        $producto = $this->route('producto');
        $localId  = $this->user()->local_id;

        return [
            'categoria_id'     => ['sometimes', 'integer',
                Rule::exists('categorias', 'id')->where('local_id', $localId),
            ],
            'nombre'           => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'slug'             => ['sometimes', 'required', 'string', 'max:140',
                Rule::unique('productos', 'slug')
                    ->where('local_id', $localId)
                    ->ignore($producto?->id),
            ],
            'descripcion'      => ['sometimes', 'nullable', 'string', 'max:1000'],
            'precio'           => ['sometimes', 'numeric', 'min:0', 'max:999999.99'],
            'precio_descuento' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'imagen_url'       => ['sometimes', 'nullable', 'url', 'max:500'],
            'imagen_public_id' => ['sometimes', 'nullable', 'string', 'max:200'],
            'disponible'       => ['sometimes', 'boolean'],
            'es_combo'         => ['sometimes', 'boolean'],
            'es_promocion'     => ['sometimes', 'boolean'],
            'tag'              => ['sometimes', 'nullable', 'string', 'max:40'],
            'orden'            => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'extras'                  => ['sometimes', 'nullable', 'array'],
            'extras.*.group'          => ['required_with:extras', 'string', 'max:40'],
            'extras.*.kind'           => ['required_with:extras', 'in:one,many'],
            'extras.*.required'       => ['nullable', 'boolean'],
            'extras.*.items'          => ['required_with:extras', 'array', 'min:1'],
            'extras.*.items.*.id'     => ['required', 'string', 'max:40'],
            'extras.*.items.*.name'   => ['required', 'string', 'max:60'],
            'extras.*.items.*.price'  => ['required', 'numeric', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('slug')) {
            $this->merge(['slug' => Str::slug($this->input('slug'))]);
        }
    }
}
