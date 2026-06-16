<?php

namespace App\Mail;

use App\Mail\Concerns\UsesEditableTemplate;
use App\Models\Local;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email transaccional disparado durante el periodo de prueba para empujar
 * al owner a configurar y publicar su menú. Tipos: trial_d3, trial_d7,
 * trial_d14, trial_ending.
 */
class TrialNudgeMail extends Mailable
{
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function __construct(
        public Local $local,
        public string $tipo,
    ) {}

    public function envelope(): Envelope
    {
        // El slug del template es `trial_nudge` para d3/d7 y `trial_will_end` para d14/ending
        $slug = in_array($this->tipo, ['trial_d14', 'trial_ending'], true) ? 'trial_will_end' : 'trial_nudge';
        return new Envelope(subject: $this->editableSubject($slug, self::SUBJECTS[$this->tipo] ?? 'ClickToEat — tu local'));
    }

    public function content(): Content
    {
        $slug = in_array($this->tipo, ['trial_d14', 'trial_ending'], true) ? 'trial_will_end' : 'trial_nudge';
        return $this->editableContent($slug, 'mail.trial_nudge', [
            'local' => $this->local,
            'tipo'  => $this->tipo,
            'cuerpo' => self::CONTENT[$this->tipo] ?? null,
            'ctaUrl' => rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/').'/admin',
        ]);
    }

    protected function templateVars(): array
    {
        $base = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
        return [
            'nombre_local' => $this->local->nombre,
            'link'         => "{$base}/admin",
            'fecha'        => now()->format('d/m/Y'),
        ];
    }

    public const SUBJECTS = [
        'trial_d3'    => '👋 ¿Ya creaste tu primer producto en ClickToEat?',
        'trial_d7'    => '🚀 Llevas una semana — termina de configurar tu local',
        'trial_d14'   => '⏱ Tu prueba está por terminar',
        'trial_ending' => '🔥 Mañana termina tu prueba gratis',
    ];

    public const CONTENT = [
        'trial_d3' => [
            'titulo'    => '¿Cómo va todo?',
            'parrafos'  => [
                'Llevas 3 días con ClickToEat. Para que tus clientes empiecen a pedir, asegúrate de tener al menos:',
            ],
            'checklist' => [
                'Tu logo y banner subidos',
                'Al menos 5 productos publicados con foto',
                'WhatsApp configurado correctamente',
                'Tu código QR impreso y pegado en el local',
            ],
            'cta'       => 'Continuar configuración',
        ],
        'trial_d7' => [
            'titulo'    => 'Una semana después…',
            'parrafos'  => [
                'Los locales que mejor convierten son los que en la primera semana ya tienen su menú completo y su QR impreso.',
                'Aprovecha que aún te quedan días de prueba para dejar todo listo.',
            ],
            'checklist' => [
                'Si todavía no has imprimido tu QR, descárgalo desde el panel.',
                'Comparte tu landing en redes para empezar a medir tráfico.',
            ],
            'cta'       => 'Ir a mi panel',
        ],
        'trial_d14' => [
            'titulo'    => 'Tu prueba termina pronto',
            'parrafos'  => [
                'Tu prueba gratis de 14 días está por terminar. Si ClickToEat te ha sido útil, suscríbete para seguir recibiendo pedidos.',
                'Sin suscripción tu landing pública se pausará y tus clientes verán un mensaje de "no disponible".',
            ],
            'checklist' => null,
            'cta'       => 'Suscribirme ahora',
        ],
        'trial_ending' => [
            'titulo'    => 'Mañana se termina',
            'parrafos'  => [
                'Tu prueba termina mañana. Si quieres seguir recibiendo pedidos sin interrupciones, activa tu suscripción hoy.',
            ],
            'checklist' => null,
            'cta'       => 'Activar suscripción',
        ],
    ];
}
