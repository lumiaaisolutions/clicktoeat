@extends('mail.layout')
@section('title', $copy['titulo'])
@section('kicker', $copy['kicker'])
@section('content')
  <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hola {{ $pedido->cliente_nombre }},</p>
  <h1 style="margin:6px 0 10px;font-size:23px;line-height:1.15;letter-spacing:-.01em;color:#1B140D;">{{ $copy['titulo'] }}</h1>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">{{ $copy['mensaje'] }}</p>

  <div style="display:inline-block;padding:7px 14px;border-radius:999px;background:{{ $copy['color'] }}1a;color:{{ $copy['color'] }};font-size:13px;font-weight:700;margin-bottom:22px;">
    {{ $copy['kicker'] }} · {{ $pedido->codigo }}
  </div>

  {{-- Resumen del pedido --}}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #ECE3D6;">
    <tr>
      <td style="padding:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#A2937F;">Tu pedido</td>
    </tr>
    @foreach ($pedido->detalles as $d)
      <tr>
        <td style="padding:5px 0;font-size:14px;color:#374151;">
          <strong style="color:#1B140D;">{{ $d->cantidad }}×</strong> {{ $d->producto_nombre }}
          <span style="float:right;color:#1B140D;font-weight:600;">${{ number_format((float) $d->precio_unitario * $d->cantidad, 2) }}</span>
        </td>
      </tr>
    @endforeach
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #ECE3D6;margin-top:8px;">
    @if ((float) $pedido->delivery_fee > 0)
      <tr><td style="padding:8px 0 0;font-size:13px;color:#7A6A5B;">Envío<span style="float:right;color:#374151;">${{ number_format((float) $pedido->delivery_fee, 2) }}</span></td></tr>
    @endif
    <tr>
      <td style="padding:10px 0 0;font-size:17px;font-weight:800;color:#1B140D;">
        Total<span style="float:right;">${{ number_format((float) $pedido->total, 2) }}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:6px 0 2px;font-size:13px;color:#7A6A5B;">
        Pago<span style="float:right;color:#374151;text-transform:capitalize;">{{ str_replace('_', ' ', $pedido->metodo_pago ?? 'por definir') }}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:2px 0;font-size:13px;color:#7A6A5B;">
        Entrega<span style="float:right;color:#374151;">{{ $pedido->metodo_entrega === 'delivery' ? 'A domicilio' : 'Recoger en sucursal' }}</span>
      </td>
    </tr>
  </table>

  {{-- Datos del negocio --}}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:22px;background:#FBF6EF;border:1px solid #F1E6D6;border-radius:14px;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#A2937F;">Dónde compraste</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#1B140D;">{{ $local->nombre }}</p>
        @if ($local->direccion)
          <p style="margin:4px 0 0;font-size:13px;color:#7A6A5B;line-height:1.5;">{{ $local->direccion }}</p>
        @endif
        @if ($local->whatsapp || $local->telefono)
          <p style="margin:4px 0 0;font-size:13px;color:#7A6A5B;">Tel: {{ $local->telefono ?? $local->whatsapp }}</p>
        @endif
      </td>
    </tr>
  </table>

  <p style="margin:20px 0 0;font-size:12.5px;color:#A2937F;line-height:1.5;">
    Recibes este correo porque hiciste un pedido en {{ $local->nombre }} a través de ClickToEat.
  </p>
@endsection
