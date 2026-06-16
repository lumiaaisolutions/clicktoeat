<!DOCTYPE html>
<html lang="es">
<body style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fafafa; color: #111;">
    <div style="background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">ClickToEat · Soporte</p>
        <h1 style="margin: 0 0 4px; font-size: 22px;">Hola {{ $ticket->user?->nombre ?? 'allá' }},</h1>
        <p style="color: #555; margin: 0 0 16px;">
            Tenemos una respuesta a tu ticket
            <strong>#{{ $ticket->id }} — {{ $ticket->asunto }}</strong>:
        </p>

        <div style="background: #f5f5f5; border-left: 3px solid #10b981; padding: 12px 16px; border-radius: 8px; white-space: pre-wrap; margin: 16px 0;">{{ $mensaje }}</div>

        <p style="color: #555;">
            Si quieres seguir conversando, entra a tu panel y abre el ticket — el hilo continúa ahí.
        </p>

        <a href="{{ config('app.url_web', 'https://clicktoeat.lumiaaisolutions.com') }}/admin/ayuda/contactar"
           style="display: inline-block; background: #FF2D2D; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Ver mi ticket
        </a>
    </div>

    <p style="color: #999; font-size: 11px; text-align: center; margin-top: 16px;">
        ClickToEat — Pide por WhatsApp sin comisiones
    </p>
</body>
</html>
