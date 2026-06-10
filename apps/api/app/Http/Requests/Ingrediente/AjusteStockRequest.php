<?php

namespace App\Http\Requests\Ingrediente;

use Illuminate\Foundation\Http\FormRequest;

class AjusteStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('ingrediente'));
    }

    public function rules(): array
    {
        return [
            'tipo'     => ['required', 'in:entrada,ajuste,merma'],
            'cantidad' => ['required', 'numeric', 'not_in:0', 'min:-999999.999', 'max:999999.999'],
            'motivo'   => ['nullable', 'string', 'max:200'],
        ];
    }
}
