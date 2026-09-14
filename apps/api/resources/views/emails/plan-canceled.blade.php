@extends('mail.layout')

@section('title', 'Cancelaste tu suscripción')
@section('kicker', 'Suscripción')

@section('content')
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#1B140D;">Cancelaste tu suscripción</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">Hola {{ $local->nombre }},</p>

  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
    Confirmamos la cancelación de tu suscripción a <strong style="color:#1B140D;">ClickToEat</strong>.
  </p>

  @if ($endsAt && $endsAt->isFuture())
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#FBF7F1;border:1px solid #ECE3D6;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#374151;">
          Sigues teniendo acceso completo a tus módulos hasta el
          <strong style="color:#1B140D;">{{ $endsAt->isoFormat('LL') }}</strong>.
        </td>
      </tr>
    </table>
  @endif

  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
    Si cambias de opinión, puedes reactivar tu plan cuando quieras desde el portal.
  </p>

  <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
    Gracias por haberlo probado.<br>
    <strong style="color:#1B140D;">Equipo ClickToEat</strong>
  </p>
@endsection
