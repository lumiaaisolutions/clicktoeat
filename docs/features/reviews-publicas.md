# Calificaciones públicas (reviews) del local

Sistema separado de las "reseñas por producto" (`resenas` table). Este es
un rating GENERAL del local 1-5 estrellas + comentario que se muestra en
la landing pública.

## Flow

1. Owner marca un pedido como `entregado` desde `/admin/pedidos`.
2. Backend automáticamente crea un `Review` pendiente con `rating=0` y
   `token` aleatorio único.
3. Owner copia el link `https://clicktoeat.lumiaaisolutions.com/review/{token}`
   y lo manda al cliente por WhatsApp (manual por ahora — automático cuando
   tengamos WhatsApp Business API).
4. Cliente abre el link → ve el form de calificación.
5. Cliente envía rating + comentario opcional → review aprobado automáticamente.
6. Aparece en la landing pública del local en una sección "Lo que dicen
   los clientes" con promedio + cards.

## Modelo

```
reviews
  id, local_id, pedido_id, cliente_nombre, cliente_telefono,
  rating (1-5, default 0=pendiente), comentario, aprobado (boolean),
  token (40 chars unique), created_at, updated_at
```

## Endpoints públicos

```
GET  /api/v1/public/reviews/local/{slug}    Lista reviews aprobados + promedio
GET  /api/v1/public/reviews/token/{token}   Validar token + datos del local
POST /api/v1/public/reviews/token/{token}   Enviar rating + comentario
```

Frontend del cliente: `apps/web/src/app/review/[token]/page.tsx`.

## Endpoints admin (futuros — para moderación)

```
GET   /api/v1/admin/reviews                 Lista todos los reviews del local
PATCH /api/v1/admin/reviews/{id}/toggle     Aprobar / des-aprobar (moderación)
```

## Componente landing

`apps/web/src/components/landing/ReviewsSection.tsx` — se renderiza al
final de `/{slug}` antes del footer. Si el local no tiene reviews, no
renderiza nada (no muestra "0 reseñas" feo).

## Anti-spam

- Cada token es único y de un solo uso (rating > 0 = ya enviado, retorna 409).
- Rate limit 5/min por IP en el endpoint POST.
- El token solo se genera al marcar el pedido como `entregado` (no expone
  endpoint público para crear reviews sin pedido previo).

## Anti-abuso (futuro)

- Owner puede des-aprobar reviews ofensivos desde panel admin.
- Reviews con comentarios > 1000 chars rechazados (validación).
- Considerar agregar honeypot field en el form si recibimos spam.
