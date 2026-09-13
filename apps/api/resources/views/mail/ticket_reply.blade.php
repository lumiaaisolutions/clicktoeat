@extends('mail.layout')

@section('title', 'Respuesta a tu ticket #'.$ticket->id)
@section('kicker', 'Soporte')

@section('content')
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">Hola {{ $ticket->user?->nombre ?? 'allá' }},</p>

  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
    Tenemos una respuesta a tu ticket
    <strong style="color:#1B140D;">#{{ $ticket->id }} — {{ $ticket->asunto }}</strong>:
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#FBF7F1;border:1px solid #ECE3D6;border-left:3px solid #2F9E67;border-radius:10px;">
    <tr>
      <td style="padding:14px 16px;font-size:14.5px;line-height:1.6;color:#374151;white-space:pre-wrap;">{{ $mensaje }}</td>
    </tr>
  </table>

  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
    Si quieres seguir conversando, entra a tu panel y abre el ticket — el hilo continúa ahí.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ config('app.url_web', 'https://clicktoeat.lumiaaisolutions.com') }}/admin/ayuda/contactar" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Ver mi ticket
        </a>
      </td>
    </tr>
  </table>
@endsection
