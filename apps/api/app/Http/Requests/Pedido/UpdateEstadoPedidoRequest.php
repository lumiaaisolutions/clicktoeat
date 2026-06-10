<?php

namespace App\Http\Requests\Pedido;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEstadoPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('updateEstado', $this->route('pedido'));
    }

    public function rules(): array
    {
        return [
            'estado' => ['required', 'in:nuevo,confirmado,preparando,listo,en_camino,entregado,cancelado'],
        ];
    }
}
