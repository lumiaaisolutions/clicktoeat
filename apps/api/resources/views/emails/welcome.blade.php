@extends('mail.layout')

@section('title', '¡Bienvenido a ClickToEat!')
@section('kicker', 'Bienvenido')

@section('content')
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#1B140D;">Bienvenido, {{ $owner->nombre }}</p>

  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">
    Tu local <strong style="color:#1B140D;">{{ $local->nombre }}</strong> ya está activo. Acabas de
    empezar tu trial gratis: los próximos <strong style="color:#1B140D;">14 días</strong> tienes acceso
    completo al plan, sin tarjeta.
  </p>

  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7A6A5B;">Tus dos enlaces</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;margin-bottom:8px;">
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;color:#7A6A5B;width:42%;vertical-align:top;">Panel de tu menú</td>
      <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;text-align:right;">
        <a href="{{ $panelUrl }}" style="color:#D2540F;font-weight:600;text-decoration:none;">{{ $panelUrl }}</a>
      </td>
    </tr>
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;color:#7A6A5B;vertical-align:top;">Tu landing pública</td>
      <td style="padding:9px 0;border-bottom:1px solid #ECE3D6;text-align:right;">
        <a href="{{ $publicUrl }}" style="color:#D2540F;font-weight:600;text-decoration:none;">{{ $publicUrl }}</a>
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 26px;">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $panelUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Abrir mi panel
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7A6A5B;">Recomendado para tus primeros 5 minutos</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14.5px;color:#374151;">
    <tr><td style="padding:8px 0;border-bottom:1px solid #ECE3D6;line-height:1.5;"><strong style="color:#D2540F;">1.</strong>&nbsp; Sube tu logo y banner en <em>Branding</em>.</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #ECE3D6;line-height:1.5;"><strong style="color:#D2540F;">2.</strong>&nbsp; Crea tus categorías (Entradas, Postres, Bebidas…).</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #ECE3D6;line-height:1.5;"><strong style="color:#D2540F;">3.</strong>&nbsp; Agrega 3 productos con foto y precio.</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #ECE3D6;line-height:1.5;"><strong style="color:#D2540F;">4.</strong>&nbsp; Comparte tu landing o imprime tu QR desde <em>Código QR</em>.</td></tr>
  </table>

  <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#374151;">
    Cuando recibas tu primer pedido por WhatsApp, ya estarás monetizando.
  </p>

  @if ($trialEnds)
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#FBF7F1;border:1px solid #ECE3D6;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#374151;">
          Tu trial termina el <strong style="color:#1B140D;">{{ $trialEnds->isoFormat('LL') }}</strong>.
          Agrega tu tarjeta en cualquier momento desde <em>Suscripción</em> — sin penalización.
        </td>
      </tr>
    </table>
  @endif

  <p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:#374151;">
    ¿Necesitas ayuda? Responde este correo, te leemos siempre.<br>
    Gracias por probarnos,<br>
    <strong style="color:#1B140D;">Equipo ClickToEat</strong>
  </p>
@endsection
