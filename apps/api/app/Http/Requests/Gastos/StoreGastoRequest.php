<?php

namespace App\Http\Requests\Gastos;

use App\Models\Gasto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGastoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Gasto::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'categoria'       => ['required', 'string', Rule::in(Gasto::CATEGORIAS)],
            'concepto'        => ['required', 'string', 'max:200'],
            // Aceptamos input en MXN como decimal (1234.56) o en centavos directo
            // según el frontend. Acá pedimos MXN por UX — el controller convierte.
            'monto_mxn'       => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'fecha'           => ['required', 'date', 'before_or_equal:today'],
            'recurrente'      => ['sometimes', 'boolean'],
            'notas'           => ['nullable', 'string', 'max:1000'],
            'comprobante_url' => ['nullable', 'url', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'monto_mxn.max'          => 'El monto máximo es $999,999.99 MXN. Para gastos mayores, divide en varios registros.',
            'fecha.before_or_equal'  => 'La fecha no puede estar en el futuro.',
            'categoria.in'           => 'Categoría no válida. Usa una de las predefinidas.',
        ];
    }
}
