<?php

namespace App\Http\Requests\Mesa;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Pedido creado por el cliente desde la mesa (QR), sin autenticación.
 * Siempre `metodo_entrega=sucursal` (consumido en el local) — la mesa sólo
 * agrega de qué mesa vino. Pago se resuelve al cerrar la cuenta (Etapa B).
 */
class StoreMesaPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cliente' => ['nullable', 'array'],
            'cliente.nombre' => ['nullable', 'string', 'min:1', 'max:120'],
            'cliente.notas' => ['nullable', 'string', 'max:500'],

            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.producto_id' => ['required', 'integer', 'min:1'],
            'items.*.cantidad' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notas' => ['nullable', 'string', 'max:200'],
            'items.*.extras' => ['nullable', 'array'],
            'items.*.extras.*.group' => ['required_with:items.*.extras', 'string', 'max:40'],
            'items.*.extras.*.item' => ['required_with:items.*.extras', 'string', 'max:60'],
            'items.*.extras.*.price' => ['required_with:items.*.extras', 'numeric', 'min:0'],
        ];
    }

    public function toOrderInput(int $mesaId): array
    {
        $cliente = $this->input('cliente', []);

        return [
            'cliente' => [
                'nombre' => $cliente['nombre'] ?? 'Mesa',
                'telefono' => '-',
                'direccion' => null,
                'notas' => $cliente['notas'] ?? null,
            ],
            'metodo_entrega' => 'sucursal',
            'metodo_pago' => 'efectivo', // resuelto de verdad al cerrar cuenta_mesa (Etapa B)
            'items' => $this->input('items'),
            'mesa_id' => $mesaId,
        ];
    }
}
