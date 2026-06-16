<x-mail::message>
# Tu pago no se procesó

Hola {{ $local->nombre }},

Intentamos cobrar tu suscripción de **ClickToEat** y el cobro fue rechazado por tu banco.

Por favor actualiza tu método de pago para evitar que se suspenda tu servicio. Tienes **3 días de gracia** antes de que se desactiven los módulos de tu plan.

<x-mail::button :url="$portal">
Actualizar método de pago
</x-mail::button>

Si crees que esto es un error, contacta a tu banco o respóndenos este correo.

Gracias,
**Equipo ClickToEat**
</x-mail::message>
