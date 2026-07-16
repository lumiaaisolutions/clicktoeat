<?php

namespace App\Events;

use App\Models\LlamadoMesero;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MeseroLlamado implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public LlamadoMesero $llamado) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("local.{$this->llamado->local_id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'llamado_id' => $this->llamado->id,
            'mesa_id' => $this->llamado->mesa_id,
        ];
    }

    public function broadcastAs(): string
    {
        return 'mesero.llamado';
    }
}
