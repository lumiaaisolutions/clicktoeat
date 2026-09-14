@extends('mail.layout')

@section('title', 'Tu pago no se procesó')
@section('kicker', 'Pago rechazado')

@section('content')
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#1B140D;">Tu pago no se procesó</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">Hola {{ $local->nombre }},</p>

  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
    Intentamos cobrar tu suscripción de <strong style="color:#1B140D;">ClickToEat</strong> y el cobro
    fue rechazado por tu banco.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#FBF3EE;border:1px solid #F3D9C8;border-left:3px solid #CB4B3E;border-radius:12px;">
    <tr>
      <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#374151;">
        Por favor actualiza tu método de pago para evitar que se suspenda tu servicio. Tienes
        <strong style="color:#CB4B3E;">3 días de gracia</strong> antes de que se desactiven los módulos de tu plan.
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $portal }}" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Actualizar método de pago
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#374151;">
    Si crees que esto es un error, contacta a tu banco o respóndenos este correo.<br>
    Gracias,<br>
    <strong style="color:#1B140D;">Equipo ClickToEat</strong>
  </p>
@endsection
