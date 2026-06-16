<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>{{ $cuerpo['titulo'] ?? 'ClickToEat' }}</title>
</head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B0B0F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:28px 28px 18px;background:#0B0B0F;color:#fff;">
            <p style="margin:0;font-size:12px;opacity:.7;letter-spacing:.08em;text-transform:uppercase;">ClickToEat</p>
            <h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;letter-spacing:-.01em;">{{ $cuerpo['titulo'] ?? 'Tu local' }}</h1>
          </td>
        </tr>

        <tr><td style="padding:24px 28px 4px;">
          <p style="margin:0;font-size:15px;color:#374151;">Hola {{ $local->nombre }},</p>

          @if (! empty($cuerpo['parrafos']))
            @foreach ($cuerpo['parrafos'] as $p)
              <p style="margin:14px 0 0;font-size:15px;color:#374151;line-height:1.55;">{{ $p }}</p>
            @endforeach
          @endif

          @if (! empty($cuerpo['checklist']))
            <ul style="margin:18px 0 0;padding:0 0 0 18px;color:#374151;">
              @foreach ($cuerpo['checklist'] as $item)
                <li style="margin:6px 0;font-size:14.5px;line-height:1.5;">{{ $item }}</li>
              @endforeach
            </ul>
          @endif
        </td></tr>

        <tr><td style="padding:22px 28px 32px;">
          <a href="{{ $ctaUrl }}" style="display:inline-block;padding:14px 22px;background:#FF2D2D;color:#fff;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">
            {{ $cuerpo['cta'] ?? 'Ir a mi panel' }}
          </a>
        </td></tr>

        <tr><td style="padding:0 28px 28px;">
          <p style="margin:0;font-size:12px;color:#6B7280;">
            Si ya tienes todo listo y solo nos lees por curiosidad, ¡buen provecho! Cualquier duda responde este correo.
          </p>
        </td></tr>
      </table>

      <p style="margin:18px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
        ClickToEat · Desarrollado por LUMIA
      </p>
    </td></tr>
  </table>
</body>
</html>
