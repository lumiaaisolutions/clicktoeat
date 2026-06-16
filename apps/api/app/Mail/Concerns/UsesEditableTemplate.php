<?php

namespace App\Mail\Concerns;

use App\Models\EmailTemplate;

/**
 * Mailables que mezclan plantilla Blade hardcoded con override del super_admin.
 *
 * Uso típico en el Mailable:
 *
 *   public function envelope(): Envelope {
 *       return new Envelope(subject: $this->editableSubject('pedido_confirmado', 'Tu pedido fue confirmado'));
 *   }
 *
 *   public function content(): Content {
 *       return $this->editableContent('pedido_confirmado', 'emails.pedido_confirmado', [...]);
 *   }
 *
 * `editableContent` busca un template DB activo con ese slug. Si existe usa
 * el HTML del template (con placeholders {{ var }} reemplazados por $with).
 * Si no, hace fallback al Blade hardcoded — comportamiento original.
 */
trait UsesEditableTemplate
{
    protected function editableSubject(string $slug, string $fallback): string
    {
        $t = EmailTemplate::findBySlug($slug);
        if (! $t) return $fallback;
        return $this->fillPlaceholders($t->subject, $this->templateVars());
    }

    /**
     * Devuelve un `Content` que sirve HTML del template editable, o cae al
     * Blade hardcoded si no hay registro activo.
     */
    protected function editableContent(string $slug, string $fallbackBlade, array $with = []): \Illuminate\Mail\Mailables\Content
    {
        $t = EmailTemplate::findBySlug($slug);
        if (! $t) {
            return new \Illuminate\Mail\Mailables\Content(view: $fallbackBlade, with: $with);
        }
        $html = $this->fillPlaceholders($t->body_html, array_merge($with, $this->templateVars()));
        return new \Illuminate\Mail\Mailables\Content(htmlString: $html);
    }

    /**
     * El Mailable concreto puede sobrescribir esto para inyectar variables
     * extra que estén en las propiedades públicas del Mailable.
     */
    protected function templateVars(): array
    {
        return [];
    }

    private function fillPlaceholders(string $tpl, array $vars): string
    {
        foreach ($vars as $k => $v) {
            if (! is_scalar($v) && ! (is_object($v) && method_exists($v, '__toString'))) continue;
            $tpl = str_replace('{{ '.$k.' }}', (string) $v, $tpl);
            $tpl = str_replace('{{'.$k.'}}',   (string) $v, $tpl);
        }
        return $tpl;
    }
}
