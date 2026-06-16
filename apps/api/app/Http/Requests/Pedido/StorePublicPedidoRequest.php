<?php

namespace App\Http\Requests\Pedido;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // endpoint público
    }

    public function rules(): array
    {
        return [
            'cliente'                  => ['required', 'array'],
            'cliente.nombre'           => ['required', 'string', 'min:2', 'max:120'],
            'cliente.email'            => ['nullable', 'email:rfc', 'max:191'],
            'cliente.telefono'         => ['required', 'string', 'min:7',  'max:20'],
            'cliente.direccion'        => ['nullable', 'string', 'max:300'],
            'cliente.lat'              => ['nullable', 'numeric', 'between:-90,90'],
            'cliente.lng'              => ['nullable', 'numeric', 'between:-180,180'],
            'cliente.notas'            => ['nullable', 'string', 'max:500'],

            'metodo_entrega'           => ['required', 'in:pickup,delivery'],
            'metodo_pago'              => ['required', 'in:efectivo,tarjeta_entrega,transferencia'],

            'items'                    => ['required', 'array', 'min:1', 'max:50'],
            'items.*.producto_id'      => ['required', 'integer', 'min:1'],
            'items.*.cantidad'         => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notas'            => ['nullable', 'string', 'max:200'],
            'items.*.extras'           => ['nullable', 'array'],
            'items.*.extras.*.group'   => ['required_with:items.*.extras', 'string', 'max:40'],
            'items.*.extras.*.item'    => ['required_with:items.*.extras', 'string', 'max:60'],
            'items.*.extras.*.price'   => ['required_with:items.*.extras', 'numeric', 'min:0'],

            // F25 — Cupón opcional (validado contra cupones del local)
            'cupon_codigo'             => ['nullable', 'string', 'max:32'],

            // F27 — Programar pedido para una hora futura (ISO 8601 o YYYY-MM-DD HH:mm)
            'programado_para'          => ['nullable', 'date', 'after:now', 'before:+72 hours'],
        ];
    }

    public function messages(): array
    {
        return [
            'metodo_entrega.in'    => 'Método de entrega inválido.',
            'metodo_pago.in'       => 'Método de pago inválido.',
            'cliente.telefono.min' => 'El teléfono parece incompleto.',
        ];
    }
}
