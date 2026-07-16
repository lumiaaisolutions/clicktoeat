<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>{{ $local->nombre }}</title>
</head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B0B0F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="padding:28px 28px 18px;background:{{ $local->color_primario ?? '#FF2D2D' }};color:#fff;">
              @if ($local->logo_url)
                <img src="{{ $local->logo_url }}" alt="" width="48" height="48" style="border-radius:12px;border:2px solid #fff;background:#fff;display:block;margin-bottom:10px;">
              @endif
              <h1 style="margin:6px 0 0;font-size:24px;line-height:1.1;letter-spacing:-.01em;">{{ $local->nombre }}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px;font-size:15px;color:#374151;line-height:1.6;">
              {!! nl2br(e($mensaje)) !!}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
