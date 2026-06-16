<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Recibimos tu pedido {{ $pedido->codigo }}</title>
</head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B0B0F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #E5E7EB;">
          {{-- Header con color del local --}}
          <tr>
            <td style="padding:28px 28px 18px;background:{{ $local->color_primario ?? '#FF2D2D' }};color:#fff;">
              @if ($local->logo_url)
                <img src="{{ $local->logo_url }}" alt="" width="48" height="48" style="border-radius:12px;border:2px solid #fff;background:#fff;display:block;margin-bottom:10px;">
              @endif
              <p style="margin:0;font-size:13px;opacity:.9;letter-spacing:.06em;text-transform:uppercase;">Recibimos tu pedido</p>
              <h1 style="margin:6px 0 0;font-size:26px;line-height:1.1;letter-spacing:-.01em;">{{ $local->nombre }}</h1>
            </td>
          </tr>

          {{-- Resumen --}}
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0;font-size:15px;color:#374151;">Hola {{ $pedido->cliente_nombre }},</p>
              <p style="margin:8px 0 0;font-size:15px;color:#374151;line-height:1.5;">
                Tu pedido <strong style="color:#0B0B0F;">{{ $pedido->codigo }}</strong> fue registrado correctamente.
                @if ($pedido->metodo_entrega === 'delivery')
                  Te lo enviamos a la dirección que indicaste.
                @elseif ($pedido->metodo_entrega === 'pickup')
                  Cuando esté listo pasarás a recogerlo al local.
                @else
                  Acércate al mostrador, te esperamos.
                @endif
              </p>
            </td>
          </tr>

          {{-- Detalle --}}
          <tr>
            <td style="padding:18px 28px 4px;">
              <p style="margin:0 0 8px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Detalle</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                @foreach ($pedido->detalles as $d)
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #F3F4F6;">
                      <strong style="font-weight:600;">{{ $d->cantidad }}×</strong> {{ $d->producto_nombre }}
                    </td>
                    <td style="padding:6px 0;border-bottom:1px solid #F3F4F6;text-align:right;font-variant-numeric:tabular-nums;">
                      ${{ number_format((float) $d->subtotal, 2) }}
                    </td>
                  </tr>
                @endforeach
                <tr>
                  <td style="padding:10px 0 4px;color:#6B7280;">Subtotal</td>
                  <td style="padding:10px 0 4px;text-align:right;">${{ number_format((float) $pedido->subtotal, 2) }}</td>
                </tr>
                @if ((float) $pedido->delivery_fee > 0)
                  <tr>
                    <td style="padding:4px 0;color:#6B7280;">Envío</td>
                    <td style="padding:4px 0;text-align:right;">${{ number_format((float) $pedido->delivery_fee, 2) }}</td>
                  </tr>
                @endif
                <tr>
                  <td style="padding:10px 0 0;font-weight:700;font-size:16px;">Total</td>
                  <td style="padding:10px 0 0;text-align:right;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;color:{{ $local->color_primario ?? '#FF2D2D' }};">
                    ${{ number_format((float) $pedido->total, 2) }}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- Datos --}}
          <tr>
            <td style="padding:20px 28px 4px;">
              <p style="margin:0 0 6px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Datos del pedido</p>
              <p style="margin:2px 0;font-size:14px;color:#374151;">
                <strong>Pago:</strong>
                @switch($pedido->metodo_pago)
                  @case('efectivo')         Efectivo @break
                  @case('tarjeta_entrega')  Tarjeta al recibir @break
                  @case('transferencia')    Transferencia @break
                  @default {{ $pedido->metodo_pago }}
                @endswitch
              </p>
              @if ($pedido->direccion)
                <p style="margin:2px 0;font-size:14px;color:#374151;"><strong>Entrega:</strong> {{ $pedido->direccion }}</p>
              @endif
              @if ($pedido->notas)
                <p style="margin:2px 0;font-size:14px;color:#374151;"><strong>Notas:</strong> {{ $pedido->notas }}</p>
              @endif
            </td>
          </tr>

          {{-- Contacto local --}}
          <tr>
            <td style="padding:20px 28px 28px;">
              <div style="background:#F9FAFB;border-radius:14px;padding:16px;">
                <p style="margin:0;font-size:13px;color:#6B7280;">Si necesitas algo, contáctanos:</p>
                <p style="margin:6px 0 0;font-size:15px;">
                  <strong>{{ $local->nombre }}</strong><br>
                  @if ($local->whatsapp)
                    WhatsApp: <a href="https://wa.me/{{ preg_replace('/\D/', '', $local->whatsapp) }}" style="color:{{ $local->color_primario ?? '#FF2D2D' }};text-decoration:none;">{{ $local->whatsapp }}</a><br>
                  @endif
                  @if ($local->direccion)
                    {{ $local->direccion }}
                  @endif
                </p>
              </div>
            </td>
          </tr>
        </table>

        <p style="margin:18px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
          Recibiste este correo porque dejaste tu email al hacer el pedido en {{ $local->nombre }}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
