# Email templates editables

Sistema que permite al `super_admin` editar el subject y el HTML de los
correos transaccionales **sin tocar código ni redeployar**, desde
`/admin/email-templates`.

## Cómo funciona

Cada `Mailable` que use el trait `App\Mail\Concerns\UsesEditableTemplate`
busca en `email_templates` un registro con `slug` matching y `active = true`.

- **Si existe**: usa el subject y el HTML del registro, sustituyendo
  placeholders `{{ nombre_variable }}`.
- **Si no existe** (o `active = false`): cae al template Blade original
  hardcoded en `resources/views/mail/`.

Esto garantiza que **nunca puedes romper un correo borrando un template** —
el fallback al Blade siempre funciona.

## Slugs reservados

| Slug                  | Mailable                          | Cuándo se envía                       |
|-----------------------|-----------------------------------|---------------------------------------|
| `pedido_confirmado`   | `PedidoConfirmadoMail`            | Cliente hace un pedido                |
| `ticket_reply`        | `TicketReplyMail`                 | Super responde un ticket              |
| `trial_will_end`      | `TrialWillEndMail`                | 3 días antes de expirar trial         |
| `trial_nudge`         | `TrialNudgeMail`                  | Día 7 del trial                       |
| `payment_failed`      | `PaymentFailedMail`               | Stripe rechaza cargo                  |
| `plan_canceled`       | `PlanCanceledMail`                | Owner cancela suscripción             |
| `welcome`             | `WelcomeMail`                     | Tras registrar local                  |
| `carrito_abandonado`  | `CarritoAbandonadoMail`           | Cliente abandona pedido               |
| `resumen_semanal`     | `ResumenSemanalMail`              | Lunes 8am al owner                    |

**Actualmente conectados**: `pedido_confirmado`, `ticket_reply`.
**Resto**: usan Blade hardcoded (agregar el trait + usar `editableSubject` /
`editableContent` para conectar).

## Placeholders disponibles

| Placeholder           | Significado                                          |
|-----------------------|------------------------------------------------------|
| `{{ nombre_local }}`  | Nombre del local                                     |
| `{{ nombre_cliente }}`| Nombre del cliente (o user destinatario)             |
| `{{ pedido_id }}`     | ID/código del pedido (o ID del ticket)               |
| `{{ total }}`         | Total del pedido formateado `$X,XXX.XX`              |
| `{{ link }}`          | URL principal de la acción (panel/landing)           |
| `{{ fecha }}`         | Fecha+hora actual `dd/mm/YYYY HH:mm`                 |
| `{{ codigo }}`        | Código de cupón / promoción                          |

Cada Mailable expone variables específicas en su método `templateVars()`.
Si necesitas una variable nueva, agrégala en `templateVars()` del Mailable
correspondiente.

## Endpoints

```
GET    /api/v1/admin/email-templates              super_admin   listado
POST   /api/v1/admin/email-templates              super_admin   crear
PATCH  /api/v1/admin/email-templates/{id}         super_admin   editar
DELETE /api/v1/admin/email-templates/{id}         super_admin   borrar
POST   /api/v1/admin/email-templates/preview      super_admin   render con sample
```

## Frontend

`apps/web/src/app/admin/email-templates/page.tsx` con:
- Listado de plantillas activas/inactivas con slug visible.
- Modal con editor de subject + body HTML + switch activo.
- Botón "Vista previa" que renderiza con datos de prueba.
- Listado de slugs sin plantilla (usando Blade hardcoded).

## Cómo conectar un Mailable más

Ejemplo conectando `WelcomeMail`:

```php
// Antes:
class WelcomeMail extends Mailable {
    public function content(): Content {
        return new Content(view: 'mail.welcome', with: [...]);
    }
}

// Después:
use App\Mail\Concerns\UsesEditableTemplate;
class WelcomeMail extends Mailable {
    use Queueable, SerializesModels, UsesEditableTemplate;

    public function envelope(): Envelope {
        return new Envelope(subject: $this->editableSubject('welcome', 'Bienvenido a ClickToEat'));
    }
    public function content(): Content {
        return $this->editableContent('welcome', 'mail.welcome', [...]);
    }
    protected function templateVars(): array {
        return ['nombre_local' => $this->local->nombre];
    }
}
```

## Mailables conectados (junio 2026, segunda iteración)

Tras la primera entrega, conectamos 6 Mailables más al sistema editable. Ahora
están conectados:

| Mailable                  | Slug                | Estado |
|---------------------------|---------------------|--------|
| `PedidoConfirmadoMail`    | `pedido_confirmado` | ✅     |
| `TicketReplyMail`         | `ticket_reply`      | ✅     |
| `WelcomeMail`             | `welcome`           | ✅     |
| `TrialNudgeMail` (d3, d7) | `trial_nudge`       | ✅     |
| `TrialNudgeMail` (d14, ending) + `TrialWillEndMail` | `trial_will_end` | ✅ |
| `PaymentFailedMail`       | `payment_failed`    | ✅     |
| `PlanCanceledMail`        | `plan_canceled`     | ✅     |
| `CarritoAbandonadoMail`   | `carrito_abandonado`| ✅     |
| `ResumenSemanalMail`      | `resumen_semanal`   | ✅     |

**Todos los Mailables del sistema están conectados**. Cada uno cae al Blade
hardcoded si no hay registro activo en `email_templates`.

Si se agrega un Mailable nuevo, hay que (1) agregar `use UsesEditableTemplate`,
(2) cambiar `Envelope(subject: ...)` por `$this->editableSubject(slug, fallback)`,
(3) cambiar `new Content(view: ...)` por `$this->editableContent(slug, blade, with)`,
y (4) implementar `protected function templateVars(): array` con las
variables que quieras exponer al editor.
