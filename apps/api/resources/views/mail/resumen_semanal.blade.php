@php
  $diff = $stats['pedidos_prev'] > 0
    ? round((($stats['pedidos'] - $stats['pedidos_prev']) / $stats['pedidos_prev']) * 100, 1)
    : ($stats['pedidos'] > 0 ? 100 : 0);
  $arrow = $diff > 0 ? '↗' : ($diff < 0 ? '↘' : '→');
  $color = $diff > 0 ? '#16A34A' : ($diff < 0 ? '#DC2626' : '#6B7280');
@endphp
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Resumen semanal · {{ $local->nombre }}</title></head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B0B0F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:28px 28px 18px;background:{{ $local->color_primario ?? '#0B0B0F' }};color:#fff;">
            <p style="margin:0;font-size:12px;opacity:.85;letter-spacing:.08em;text-transform:uppercase;">Resumen semanal</p>
            <h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;">{{ $local->nombre }}</h1>
          </td>
        </tr>

        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0;font-size:15px;color:#374151;">Esto fue lo que pasó esta semana en tu local:</p>
        </td></tr>

        <tr><td style="padding:12px 28px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="padding:12px;background:#FAFAF7;border-radius:14px;text-align:center;width:33%;">
                <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Pedidos</p>
                <p style="margin:6px 0 2px;font-size:28px;font-weight:800;color:#0B0B0F;">{{ $stats['pedidos'] }}</p>
                <p style="margin:0;font-size:11px;color:{{ $color }};font-weight:600;">{{ $arrow }} {{ abs($diff) }}% vs semana pasada</p>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:12px;background:#FAFAF7;border-radius:14px;text-align:center;width:33%;">
                <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Ventas</p>
                <p style="margin:6px 0 2px;font-size:22px;font-weight:800;color:{{ $local->color_primario ?? '#FF2D2D' }};">${{ number_format($stats['ventas'], 0) }}</p>
                <p style="margin:0;font-size:11px;color:#6B7280;">MXN</p>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:12px;background:#FAFAF7;border-radius:14px;text-align:center;width:33%;">
                <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Ticket promedio</p>
                <p style="margin:6px 0 2px;font-size:22px;font-weight:800;color:#0B0B0F;">${{ number_format($stats['ticket'], 0) }}</p>
                <p style="margin:0;font-size:11px;color:#6B7280;">por pedido</p>
              </td>
            </tr>
          </table>
        </td></tr>

        @if (! empty($stats['top']))
          <tr><td style="padding:18px 28px 8px;">
            <p style="margin:0 0 8px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Tus productos más pedidos</p>
            <table role="presentation" width="100%" style="font-size:14px;">
              @foreach ($stats['top'] as $i => $p)
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #F3F4F6;">
                    <strong>#{{ $i + 1 }}</strong> {{ $p['nombre'] }}
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #F3F4F6;text-align:right;font-variant-numeric:tabular-nums;color:#6B7280;">
                    {{ $p['unidades'] }} unidades
                  </td>
                </tr>
              @endforeach
            </table>
          </td></tr>
        @endif

        <tr><td style="padding:18px 28px 32px;">
          <a href="{{ $panelUrl }}" style="display:inline-block;padding:12px 20px;background:#0B0B0F;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
            Ver detalle en tu panel →
          </a>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
        Recibirás este resumen cada domingo. Puedes desactivarlo desde tu perfil.
      </p>
    </td></tr>
  </table>
</body>
</html>
