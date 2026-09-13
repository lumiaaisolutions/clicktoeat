@extends('mail.layout')

@section('title', 'Recibimos tu pedido '.$pedido->codigo)
@section('kicker', 'Recibimos tu pedido')

@section('content')
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">Hola {{ $pedido->cliente_nombre }},</p>

  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">
    Tu pedido <strong style="color:#1B140D;">{{ $pedido->codigo }}</strong> en
    <strong style="color:#1B140D;">{{ $local->nombre }}</strong> fue registrado correctamente.
    @if ($pedido->metodo_entrega === 'delivery')
      Te lo enviamos a la dirección que indicaste.
    @elseif ($pedido->metodo_entrega === 'pickup')
      Cuando esté listo pasarás a recogerlo al local.
    @else
      Acércate al mostrador, te esperamos.
    @endif
  </p>

  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7A6A5B;">Detalle</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
    @foreach ($pedido->detalles as $d)
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;">
          <strong style="font-weight:600;color:#1B140D;">{{ $d->cantidad }}×</strong> {{ $d->producto_nombre }}
        </td>
        <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">
          ${{ number_format((float) $d->subtotal, 2) }}
        </td>
      </tr>
    @endforeach
    <tr>
      <td style="padding:12px 0 4px;color:#7A6A5B;">Subtotal</td>
      <td style="padding:12px 0 4px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">${{ number_format((float) $pedido->subtotal, 2) }}</td>
    </tr>
    @if ((float) $pedido->delivery_fee > 0)
      <tr>
        <td style="padding:4px 0;color:#7A6A5B;">Envío</td>
        <td style="padding:4px 0;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">${{ number_format((float) $pedido->delivery_fee, 2) }}</td>
      </tr>
    @endif
    <tr>
      <td style="padding:12px 0 0;font-weight:700;font-size:16px;color:#1B140D;border-top:2px solid #ECE3D6;">Total</td>
      <td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap;color:#D2540F;border-top:2px solid #ECE3D6;">
        ${{ number_format((float) $pedido->total, 2) }}
      </td>
    </tr>
  </table>

  <p style="margin:26px 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7A6A5B;">Datos del pedido</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;color:#7A6A5B;width:38%;vertical-align:top;">Pago</td>
      <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;text-align:right;color:#1B140D;">
        @switch($pedido->metodo_pago)
          @case('efectivo')         Efectivo @break
          @case('tarjeta_entrega')  Tarjeta al recibir @break
          @case('transferencia')    Transferencia @break
          @default {{ $pedido->metodo_pago }}
        @endswitch
      </td>
    </tr>
    @if ($pedido->direccion)
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;color:#7A6A5B;vertical-align:top;">Entrega</td>
        <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;text-align:right;color:#1B140D;">{{ $pedido->direccion }}</td>
      </tr>
    @endif
    @if ($pedido->notas)
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;color:#7A6A5B;vertical-align:top;">Notas</td>
        <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;text-align:right;color:#1B140D;">{{ $pedido->notas }}</td>
      </tr>
    @endif
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;background:#FBF7F1;border:1px solid #ECE3D6;border-radius:14px;">
    <tr>
      <td style="padding:18px 20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#7A6A5B;">Si necesitas algo, contacta al local:</p>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#1B140D;">
          <strong>{{ $local->nombre }}</strong><br>
          @if ($local->whatsapp)
            WhatsApp: <a href="https://wa.me/{{ preg_replace('/\D/', '', $local->whatsapp) }}" style="color:#D2540F;font-weight:600;text-decoration:none;">{{ $local->whatsapp }}</a><br>
          @endif
          @if ($local->direccion)
            <span style="color:#374151;">{{ $local->direccion }}</span>
          @endif
        </p>
      </td>
    </tr>
  </table>

  <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#A2937F;">
    Recibiste este correo porque dejaste tu email al hacer el pedido en {{ $local->nombre }}.
  </p>
@endsection
