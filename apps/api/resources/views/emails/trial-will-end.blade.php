@extends('mail.layout')

@section('title', 'Tu trial está por terminar')
@section('kicker', 'Tu trial')

@section('content')
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#1B140D;">Tu trial está por terminar</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">Hola {{ $local->nombre }},</p>

  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
    Tu trial de <strong style="color:#1B140D;">ClickToEat</strong> termina en
    <strong style="color:#B4790C;">{{ $daysLeft }} {{ $daysLeft === 1 ? 'día' : 'días' }}</strong>
    ({{ $local->trial_ends_at?->isoFormat('LL') }}).
  </p>

  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
    Para que tu local siga recibiendo pedidos sin interrupción, agrega tu método de pago.
    Toma menos de un minuto.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $portal }}" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Agregar método de pago
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#374151;">
    ¿Tienes dudas? Responde este correo y te ayudamos.<br>
    Gracias,<br>
    <strong style="color:#1B140D;">Equipo ClickToEat</strong>
  </p>
@endsection
