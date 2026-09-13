@extends('mail.layout')

@section('title', 'Tu carrito en '.$local->nombre)
@section('kicker', '🛒 Pendiente de enviar')

@section('content')
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">Hola{{ $clienteNombre ? ' '.$clienteNombre : '' }},</p>

  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">
    Vimos que armaste un pedido en <strong style="color:#1B140D;">{{ $local->nombre }}</strong>
    pero no lo terminaste. Tu antojo te está esperando.
  </p>

  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7A6A5B;">Tu carrito</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
    @foreach ($items as $it)
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;">
          <strong style="font-weight:600;color:#1B140D;">{{ $it['cantidad'] }}×</strong> {{ $it['nombre'] }}
        </td>
        <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">
          ${{ number_format((float) $it['precio'] * (int) $it['cantidad'], 2) }}
        </td>
      </tr>
    @endforeach
    <tr>
      <td style="padding:12px 0 0;font-weight:700;font-size:16px;color:#1B140D;border-top:2px solid #ECE3D6;">Total aproximado</td>
      <td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap;color:#D2540F;border-top:2px solid #ECE3D6;">
        ${{ number_format($totalEstimado, 2) }}
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $landingUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Terminar mi pedido
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#A2937F;">
    Si ya hiciste tu pedido o no te interesa, ignora este correo.
  </p>
@endsection
