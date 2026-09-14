@extends('mail.layout')
@section('title', 'Confirma tu correo')
@section('kicker', 'Confirma tu cuenta')
@section('content')
  <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hola {{ $nombre }},</p>
  <h1 style="margin:6px 0 12px;font-size:23px;line-height:1.15;letter-spacing:-.01em;color:#1B140D;">Confirma tu correo</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">
    Gracias por crear tu cuenta en ClickToEat. Toca el botón para confirmar que este correo es tuyo — así podemos enviarte tus avisos y ayudarte a recuperar el acceso si lo necesitas.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $url }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Confirmar mi correo</a>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 6px;font-size:13.5px;color:#7A6A5B;line-height:1.5;">Este enlace expira en <strong style="color:#1B140D;">60 minutos</strong>.</p>
  <p style="margin:0;font-size:13.5px;color:#7A6A5B;line-height:1.5;">
    Si no creaste esta cuenta, ignora este mensaje.
  </p>
@endsection
