<?php

namespace App\Http\Requests\Pedido;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Pedido creado desde el panel del local (punto de venta presencial).
 *
 * Diferencias vs StorePublicPedidoRequest:
 *  - `cliente.nombre` es opcional (default "Mostrador").
 *  - `cliente.telefono` es opcional (no se envía a WhatsApp).
 *  - Acepta el método de entrega `sucursal` y el método de pago `tarjeta_tpv`.
 *  - El usuario autenticado YA define el local — el controller no necesita slug.
 */
class StoreInternalPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user !== null
            && $user->local_id !== null
            && in_array($user->rol, ['owner', 'staff', 'super_admin'], true);
    }

    public function rules(): array
    {
        return [
            'cliente'                  => ['nullable', 'array'],
            'cliente.nombre'           => ['nullable', 'string', 'min:1', 'max:120'],
            'cliente.telefono'         => ['nullable', 'string', 'min:7', 'max:20'],
            'cliente.notas'            => ['nullable', 'string', 'max:500'],

            'metodo_entrega'           => ['required', 'in:pickup,delivery,sucursal'],
            'metodo_pago'              => ['required', 'in:efectivo,tarjeta_entrega,tarjeta_tpv,transferencia'],

            'items'                    => ['required', 'array', 'min:1', 'max:50'],
            'items.*.producto_id'      => ['required', 'integer', 'min:1'],
            'items.*.cantidad'         => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notas'            => ['nullable', 'string', 'max:200'],
            'items.*.extras'           => ['nullable', 'array'],
            'items.*.extras.*.group'   => ['required_with:items.*.extras', 'string', 'max:40'],
            'items.*.extras.*.item'    => ['required_with:items.*.extras', 'string', 'max:60'],
            'items.*.extras.*.price'   => ['required_with:items.*.extras', 'numeric', 'min:0'],
        ];
    }

    /**
     * Normaliza el payload para que OrderService::crear() lo entienda igual
     * que un pedido público.
     */
    public function toOrderInput(): array
    {
        $cliente = $this->input('cliente', []);

        return [
            'cliente' => [
                'nombre'    => $cliente['nombre']    ?? 'Mostrador',
                'telefono'  => $cliente['telefono']  ?? '-',
                'direccion' => null,
                'notas'     => $cliente['notas']     ?? null,
            ],
            'metodo_entrega' => $this->input('metodo_entrega'),
            'metodo_pago'    => $this->input('metodo_pago'),
            'items'          => $this->input('items'),
        ];
    }
}
