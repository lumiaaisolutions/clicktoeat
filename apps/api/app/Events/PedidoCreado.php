<?php

namespace App\Events;

use App\Models\Pedido;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Se dispara cuando se crea un pedido (público o POS).
 *
 * Implementa ShouldBroadcastAfterCommit → broadcast SÓLO si la transacción
 * se commiteó (evita "fantasma" si la creación se rollback-ea por stock).
 *
 * Funciona con cualquier driver de broadcasting: pusher, reverb, log (dev).
 * Sin BROADCAST_CONNECTION configurado, el evento se dispara pero no llega
 * a nadie — comportamiento seguro (frontend sigue con polling).
 */
class PedidoCreado implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Pedido $pedido) {}

    /**
     * Canal privado por local. Sólo usuarios autenticados del local pueden
     * suscribirse (ver routes/channels.php).
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("local.{$this->pedido->local_id}")];
    }

    /**
     * Payload mínimo — el frontend hace refresh completo para obtener
     * detalles. Esto reduce el tamaño del mensaje WebSocket.
     */
    public function broadcastWith(): array
    {
        return [
            'pedido_id'      => $this->pedido->id,
            'codigo'         => $this->pedido->codigo,
            'cliente'        => $this->pedido->cliente_nombre,
            'total'          => (float) $this->pedido->total,
            'metodo_entrega' => $this->pedido->metodo_entrega,
            'estado'         => $this->pedido->estado,
            'created_at'     => $this->pedido->created_at?->toIso8601String(),
        ];
    }

    /**
     * Nombre del evento que el cliente escucha:
     *   echo.private(`local.${id}`).listen('.pedido.creado', ...)
     */
    public function broadcastAs(): string
    {
        return 'pedido.creado';
    }
}
