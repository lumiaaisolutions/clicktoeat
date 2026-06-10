<?php

namespace App\Http\Requests\Producto;

use App\Models\Categoria;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Producto::class);
    }

    public function rules(): array
    {
        $localId = $this->user()->local_id;

        return [
            'categoria_id'      => ['required', 'integer',
                Rule::exists('categorias', 'id')->where('local_id', $localId),
            ],
            'nombre'            => ['required', 'string', 'min:2', 'max:120'],
            'slug'              => ['nullable', 'string', 'max:140',
                Rule::unique('productos', 'slug')->where('local_id', $localId),
            ],
            'descripcion'       => ['nullable', 'string', 'max:1000'],
            'precio'            => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'precio_descuento'  => ['nullable', 'numeric', 'min:0', 'lt:precio'],
            'imagen_url'        => ['nullable', 'url', 'max:500'],
            'imagen_public_id'  => ['nullable', 'string', 'max:200'],
            'disponible'        => ['nullable', 'boolean'],
            'es_combo'          => ['nullable', 'boolean'],
            'es_promocion'      => ['nullable', 'boolean'],
            'tag'               => ['nullable', 'string', 'max:40'],
            'orden'             => ['nullable', 'integer', 'min:0', 'max:9999'],
            'extras'                       => ['nullable', 'array'],
            'extras.*.group'               => ['required_with:extras', 'string', 'max:40'],
            'extras.*.kind'                => ['required_with:extras', 'in:one,many'],
            'extras.*.required'            => ['nullable', 'boolean'],
            'extras.*.items'               => ['required_with:extras', 'array', 'min:1'],
            'extras.*.items.*.id'          => ['required', 'string', 'max:40'],
            'extras.*.items.*.name'        => ['required', 'string', 'max:60'],
            'extras.*.items.*.price'       => ['required', 'numeric', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('nombre')) {
            $this->merge(['slug' => Str::slug($this->input('nombre'))]);
        }
    }
}
