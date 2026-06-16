<x-mail::message>
# Cancelaste tu suscripción

Hola {{ $local->nombre }},

Confirmamos la cancelación de tu suscripción a **ClickToEat**.

@if ($endsAt && $endsAt->isFuture())
Sigues teniendo acceso completo a tus módulos hasta el **{{ $endsAt->isoFormat('LL') }}**.
@endif

Si cambias de opinión, puedes reactivar tu plan cuando quieras desde el portal.

Gracias por haberlo probado.
**Equipo ClickToEat**
</x-mail::message>
