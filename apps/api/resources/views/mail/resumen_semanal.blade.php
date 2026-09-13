@php
  $diff = $stats['pedidos_prev'] > 0
    ? round((($stats['pedidos'] - $stats['pedidos_prev']) / $stats['pedidos_prev']) * 100, 1)
    : ($stats['pedidos'] > 0 ? 100 : 0);
  $arrow = $diff > 0 ? '↗' : ($diff < 0 ? '↘' : '→');
  $color = $diff > 0 ? '#2F9E67' : ($diff < 0 ? '#CB4B3E' : '#7A6A5B');
@endphp
@extends('mail.layout')

@section('title', 'Resumen semanal · '.$local->nombre)
@section('kicker', 'Resumen semanal')

@section('content')
  <p style="margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#1B140D;">{{ $local->nombre }}</p>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">Esto fue lo que pasó esta semana en tu local:</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:14px 12px;background:#FBF7F1;border:1px solid #ECE3D6;border-radius:14px;text-align:center;width:33%;vertical-align:top;">
        <p style="margin:0;font-size:11px;color:#7A6A5B;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Pedidos</p>
        <p style="margin:8px 0 4px;font-size:28px;font-weight:800;color:#1B140D;">{{ $stats['pedidos'] }}</p>
        <p style="margin:0;font-size:11px;color:{{ $color }};font-weight:600;">{{ $arrow }} {{ abs($diff) }}% vs semana pasada</p>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:14px 12px;background:#FBF7F1;border:1px solid #ECE3D6;border-radius:14px;text-align:center;width:33%;vertical-align:top;">
        <p style="margin:0;font-size:11px;color:#7A6A5B;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Ventas</p>
        <p style="margin:8px 0 4px;font-size:22px;font-weight:800;color:#D2540F;">${{ number_format($stats['ventas'], 0) }}</p>
        <p style="margin:0;font-size:11px;color:#7A6A5B;">MXN</p>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:14px 12px;background:#FBF7F1;border:1px solid #ECE3D6;border-radius:14px;text-align:center;width:33%;vertical-align:top;">
        <p style="margin:0;font-size:11px;color:#7A6A5B;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Ticket promedio</p>
        <p style="margin:8px 0 4px;font-size:22px;font-weight:800;color:#1B140D;">${{ number_format($stats['ticket'], 0) }}</p>
        <p style="margin:0;font-size:11px;color:#7A6A5B;">por pedido</p>
      </td>
    </tr>
  </table>

  @if (! empty($stats['top']))
    <p style="margin:28px 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7A6A5B;">Tus productos más pedidos</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
      @foreach ($stats['top'] as $i => $p)
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;">
            <strong style="font-weight:600;color:#1B140D;">#{{ $i + 1 }}</strong> {{ $p['nombre'] }}
          </td>
          <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;text-align:right;font-variant-numeric:tabular-nums;color:#7A6A5B;white-space:nowrap;">
            {{ $p['unidades'] }} unidades
          </td>
        </tr>
      @endforeach
    </table>
  @endif

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="border-radius:12px;background:#1B140D;">
        <a href="{{ $panelUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Ver detalle en tu panel
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#A2937F;">
    Recibirás este resumen cada domingo. Puedes desactivarlo desde tu perfil.
  </p>
@endsection
