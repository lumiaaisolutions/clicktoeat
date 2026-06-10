<?php

namespace App\Http\Requests\Compra;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Compra::class);
    }

    public function rules(): array
    {
        $localId = $this->user()->local_id;

        return [
            'proveedor'           => ['nullable', 'string', 'max:150'],
            'referencia_factura'  => ['nullable', 'string', 'max:60'],
            'fecha'               => ['nullable', 'date'],
            'impuestos'           => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'notas'               => ['nullable', 'string', 'max:1000'],

            'items'                       => ['required', 'array', 'min:1', 'max:100'],
            'items.*.ingrediente_id'      => ['required', 'integer',
                Rule::exists('ingredientes', 'id')->where('local_id', $localId),
            ],
            'items.*.cantidad'            => ['required', 'numeric', 'min:0.001', 'max:999999.999'],
            'items.*.costo_unitario'      => ['required', 'numeric', 'min:0',     'max:999999.99'],
        ];
    }
}
