<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Tu carrito en {{ $local->nombre }}</title></head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B0B0F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:28px 28px 18px;background:{{ $local->color_primario ?? '#FF2D2D' }};color:#fff;">
            <p style="margin:0;font-size:13px;opacity:.9;letter-spacing:.06em;text-transform:uppercase;">🛒 Pendiente de enviar</p>
            <h1 style="margin:6px 0 0;font-size:24px;line-height:1.1;">Te quedó algo en el carrito</h1>
          </td>
        </tr>
        <tr><td style="padding:24px 28px 4px;">
          <p style="margin:0;font-size:15px;color:#374151;">Hola{{ $clienteNombre ? ' '.$clienteNombre : '' }},</p>
          <p style="margin:10px 0 0;font-size:15px;color:#374151;line-height:1.55;">
            Vimos que armaste un pedido en <strong>{{ $local->nombre }}</strong> pero no lo terminaste.
            Tu antojo te está esperando 👀
          </p>
        </td></tr>

        <tr><td style="padding:18px 28px;">
          <table role="presentation" width="100%" style="font-size:14px;">
            @foreach ($items as $it)
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #F3F4F6;">
                  <strong>{{ $it['cantidad'] }}×</strong> {{ $it['nombre'] }}
                </td>
                <td style="padding:6px 0;border-bottom:1px solid #F3F4F6;text-align:right;font-variant-numeric:tabular-nums;">
                  ${{ number_format((float) $it['precio'] * (int) $it['cantidad'], 2) }}
                </td>
              </tr>
            @endforeach
            <tr>
              <td style="padding:10px 0;font-weight:700;">Total aproximado</td>
              <td style="padding:10px 0;text-align:right;font-weight:700;color:{{ $local->color_primario ?? '#FF2D2D' }};font-variant-numeric:tabular-nums;">
                ${{ number_format($totalEstimado, 2) }}
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:18px 28px 32px;">
          <a href="{{ $landingUrl }}" style="display:inline-block;padding:14px 22px;background:{{ $local->color_primario ?? '#FF2D2D' }};color:#fff;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">
            Terminar mi pedido →
          </a>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
        Si ya hiciste tu pedido o no te interesa, ignora este correo.
      </p>
    </td></tr>
  </table>
</body>
</html>
