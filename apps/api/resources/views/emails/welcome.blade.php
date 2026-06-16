<x-mail::message>
# Bienvenido a ClickToEat, {{ $owner->nombre }}

Tu local **{{ $local->nombre }}** ya está activo. Acabas de empezar tu trial gratis:
los próximos **14 días** tienes acceso completo al plan, sin tarjeta.

## Tus dos enlaces

- **Panel para administrar tu menú** → [{{ $panelUrl }}]({{ $panelUrl }})
- **Tu landing pública** (la que comparten tus clientes) → [{{ $publicUrl }}]({{ $publicUrl }})

<x-mail::button :url="$panelUrl">
Abrir mi panel
</x-mail::button>

## Recomendado para los primeros 5 minutos

1. **Sube tu logo y banner** en *Branding*.
2. **Crea tus categorías** (Entradas, Postres, Bebidas…).
3. **Agrega 3 productos** con foto y precio.
4. **Comparte tu landing** o imprime tu QR desde *Código QR*.

Cuando recibas tu primer pedido por WhatsApp, ya estarás monetizando.

@if ($trialEnds)
> Tu trial termina el **{{ $trialEnds->isoFormat('LL') }}**. Agrega tu tarjeta
> en cualquier momento desde *Suscripción* — sin penalización.
@endif

¿Necesitas ayuda? Responde este correo, te leemos siempre.

Gracias por probarnos,
**Equipo ClickToEat**
</x-mail::message>
