{{--
  Layout base de TODOS los correos de ClickToEat.
  Diseño: splash con gradiente naranja + logo ClickToEat (wordmark blanco, sin
  fondo/transparente sobre el gradiente) → tarjeta blanca limpia → footer con
  el correo de contacto. Uso: @extends('mail.layout') + @section('content').
  Secciones opcionales: @section('title'), @section('kicker').
--}}
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <title>@yield('title', 'ClickToEat')</title>
</head>
<body style="margin:0;padding:0;background:#F6F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1B140D;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1EA;padding:28px 14px 44px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          {{-- Splash header suave (durazno → crema) + logo ClickToEat (mark + wordmark) --}}
          <tr>
            <td style="border-radius:22px 22px 0 0;padding:32px 32px 26px;text-align:center;background:#FBE4D2;background:linear-gradient(180deg,#F9CDA8 0%,#FBE4D2 44%,#FDF7F1 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:7px;line-height:0;">
                    <img src="https://clicktoeat.lumiaaisolutions.com/email-logo.png" width="38" height="38" alt="ClickToEat" style="display:block;border:0;outline:none;">
                  </td>
                  <td style="vertical-align:middle;font-size:26px;font-weight:800;letter-spacing:-.02em;color:#1B140D;line-height:1;">
                    Click<span style="color:#F26A1F;">To</span>Eat
                  </td>
                </tr>
              </table>
              @hasSection('kicker')
                <div style="margin-top:14px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C06A1E;">@yield('kicker')</div>
              @endif
            </td>
          </tr>

          {{-- Cuerpo — tarjeta blanca limpia --}}
          <tr>
            <td style="background:#ffffff;padding:32px 32px 34px;border-left:1px solid #ECE3D6;border-right:1px solid #ECE3D6;">
              @yield('content')
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="background:#ffffff;border-radius:0 0 22px 22px;border:1px solid #ECE3D6;border-top:0;padding:22px 32px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#7A6A5B;">
                ¿Dudas o algo salió mal? Escríbenos a
                <a href="mailto:contacto@lumiaaisolutions.com" style="color:#D2540F;font-weight:600;text-decoration:none;">contacto@lumiaaisolutions.com</a>
              </p>
              <p style="margin:0;font-size:11.5px;line-height:1.5;color:#A2937F;">
                Enviado por <strong style="color:#7A6A5B;">ClickToEat</strong> · Tu menú online + pedidos por WhatsApp, sin comisiones.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
