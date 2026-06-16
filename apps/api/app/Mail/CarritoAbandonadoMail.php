<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CarritoAbandonadoMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(
        public Local $local,
        public string $clienteNombre,
        public array  $items,
        public float  $totalEstimado,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->editableSubject('carrito_abandonado', "🛒 Te quedó algo pendiente en {$this->local->nombre}"),
            replyTo: $this->local->email_contacto ? [$this->local->email_contacto] : [],
        );
    }

    public function content(): Content
    {
        $landing = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/').'/'.$this->local->slug;
        return $this->editableContent('carrito_abandonado', 'mail.carrito_abandonado', [
            'local' => $this->local,
            'clienteNombre' => $this->clienteNombre,
            'items' => $this->items,
            'totalEstimado' => $this->totalEstimado,
            'landingUrl'    => $landing,
        ]);
    }

    protected function templateVars(): array
    {
        $landing = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/').'/'.$this->local->slug;
        return [
            'nombre_local'   => $this->local->nombre,
            'nombre_cliente' => $this->clienteNombre,
            'total'          => '$'.number_format($this->totalEstimado, 2),
            'link'           => $landing,
            'fecha'          => now()->format('d/m/Y H:i'),
        ];
    }
}
