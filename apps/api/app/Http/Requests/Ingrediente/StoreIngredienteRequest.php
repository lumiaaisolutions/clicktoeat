<?php

namespace App\Http\Requests\Ingrediente;

use Illuminate\Foundation\Http\FormRequest;

class StoreIngredienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Ingrediente::class);
    }

    public function rules(): array
    {
        return [
            'nombre'         => ['required', 'string', 'min:1', 'max:80'],
            'stock'          => ['required', 'numeric', 'min:0', 'max:999999.999'],
            'stock_minimo'   => ['nullable', 'numeric', 'min:0', 'max:999999.999'],
            'unidad'         => ['required', 'in:pz,kg,g,l,ml'],
            'costo_unitario' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'activo'         => ['nullable', 'boolean'],
        ];
    }
}
