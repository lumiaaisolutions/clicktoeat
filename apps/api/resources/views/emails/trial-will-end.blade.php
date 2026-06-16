<x-mail::message>
# Tu trial está por terminar

Hola {{ $local->nombre }},

Tu trial de **ClickToEat** termina en **{{ $daysLeft }} {{ $daysLeft === 1 ? 'día' : 'días' }}** ({{ $local->trial_ends_at?->isoFormat('LL') }}).

Para que tu local siga recibiendo pedidos sin interrupción, agrega tu método de pago. Toma menos de un minuto.

<x-mail::button :url="$portal">
Agregar método de pago
</x-mail::button>

¿Tienes dudas? Responde este correo y te ayudamos.

Gracias,
**Equipo ClickToEat**
</x-mail::message>
