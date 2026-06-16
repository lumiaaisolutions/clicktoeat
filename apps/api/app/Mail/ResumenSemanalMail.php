<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResumenSemanalMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(
        public Local $local,
        public array $stats, // ['pedidos', 'ventas', 'ticket', 'top', 'pedidos_prev', 'ventas_prev']
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->editableSubject('resumen_semanal', "📊 Tu semana en {$this->local->nombre}"));
    }

    public function content(): Content
    {
        return $this->editableContent('resumen_semanal', 'mail.resumen_semanal', [
            'local' => $this->local,
            'stats' => $this->stats,
            'panelUrl' => rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/').'/admin/metricas',
        ]);
    }

    protected function templateVars(): array
    {
        $base = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
        return [
            'nombre_local' => $this->local->nombre,
            'total'        => '$'.number_format((float) ($this->stats['ventas'] ?? 0), 2),
            'link'         => "{$base}/admin/metricas",
            'fecha'        => now()->format('d/m/Y'),
        ];
    }
}
