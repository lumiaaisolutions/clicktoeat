@extends('mail.layout')
@section('title', 'Restablecer contraseña')
@section('kicker', 'Seguridad de tu cuenta')
@section('content')
  <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hola {{ $nombre }},</p>
  <h1 style="margin:6px 0 12px;font-size:23px;line-height:1.15;letter-spacing:-.01em;color:#1B140D;">Restablece tu contraseña</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">
    Recibimos una solicitud para restablecer tu contraseña en ClickToEat. Toca el botón para elegir una nueva.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $url }}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Restablecer contraseña</a>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 6px;font-size:13.5px;color:#7A6A5B;line-height:1.5;">Este enlace expira en <strong style="color:#1B140D;">60 minutos</strong>.</p>
  <p style="margin:0;font-size:13.5px;color:#7A6A5B;line-height:1.5;">
    Si no solicitaste este cambio, ignora este mensaje — tu cuenta sigue segura.
  </p>
@endsection
