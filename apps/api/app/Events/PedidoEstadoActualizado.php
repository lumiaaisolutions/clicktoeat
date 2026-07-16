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
 * Se dispara cuando cambia `pedidos.estado`. Reutiliza el mismo canal que
 * `PedidoCreado` (`local.{id}`, ya autorizado en routes/channels.php) —
 * cocina/mesero escuchan este mismo canal filtrando por `mesa_id`.
 */
class PedidoEstadoActualizado implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Pedido $pedido) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("local.{$this->pedido->local_id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'pedido_id' => $this->pedido->id,
            'mesa_id' => $this->pedido->mesa_id,
            'estado' => $this->pedido->estado,
        ];
    }

    public function broadcastAs(): string
    {
        return 'pedido.estado_actualizado';
    }
}
