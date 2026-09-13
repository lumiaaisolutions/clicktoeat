@extends('mail.layout')

@section('title', $cuerpo['titulo'] ?? 'ClickToEat')
@section('kicker', 'Tu trial')

@section('content')
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:#1B140D;">{{ $cuerpo['titulo'] ?? 'Tu local' }}</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">Hola {{ $local->nombre }},</p>

  @if (! empty($cuerpo['parrafos']))
    @foreach ($cuerpo['parrafos'] as $p)
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">{{ $p }}</p>
    @endforeach
  @endif

  @if (! empty($cuerpo['checklist']))
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;font-size:14.5px;color:#374151;">
      @foreach ($cuerpo['checklist'] as $item)
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ECE3D6;line-height:1.5;">
            <span style="color:#D2540F;font-weight:700;">•</span>&nbsp; {{ $item }}
          </td>
        </tr>
      @endforeach
    </table>
  @endif

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
    <tr>
      <td style="border-radius:12px;background:#F26A1F;">
        <a href="{{ $ctaUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          {{ $cuerpo['cta'] ?? 'Ir a mi panel' }}
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#A2937F;">
    Si ya tienes todo listo y solo nos lees por curiosidad, ¡buen provecho! Cualquier duda responde este correo.
  </p>
@endsection
