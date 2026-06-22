<?php

namespace App\Http\Requests\Gastos;

use App\Models\Gasto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGastoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('gasto')) ?? false;
    }

    public function rules(): array
    {
        return [
            'categoria'       => ['sometimes', 'string', Rule::in(Gasto::CATEGORIAS)],
            'concepto'        => ['sometimes', 'string', 'max:200'],
            'monto_mxn'       => ['sometimes', 'numeric', 'min:0.01', 'max:999999.99'],
            'fecha'           => ['sometimes', 'date', 'before_or_equal:today'],
            'recurrente'      => ['sometimes', 'boolean'],
            'notas'           => ['nullable', 'string', 'max:1000'],
            'comprobante_url' => ['nullable', 'url', 'max:500'],
        ];
    }
}
