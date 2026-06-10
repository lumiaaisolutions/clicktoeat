<?php

namespace App\Http\Requests\Ingrediente;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIngredienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('ingrediente'));
    }

    public function rules(): array
    {
        return [
            'nombre'         => ['sometimes', 'required', 'string', 'min:1', 'max:80'],
            'stock'          => ['sometimes', 'numeric', 'min:0', 'max:999999.999'],
            'stock_minimo'   => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.999'],
            'unidad'         => ['sometimes', 'in:pz,kg,g,l,ml'],
            'costo_unitario' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99'],
            'activo'         => ['sometimes', 'boolean'],
        ];
    }
}
