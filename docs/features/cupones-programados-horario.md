# Cupones programados por horario

Cupones que se activan/desactivan automáticamente según día y hora. Por ejemplo:

- **2x1 en cervezas** los miércoles 5-7 PM
- **Combo del día** todos los días 12-3 PM
- **20% en postres** lunes a viernes 6-9 PM

## Cómo funciona

Los cupones existentes (`/admin/cupones`) ahora pueden tener 3 campos
opcionales extra:

- `hora_inicio` (ej. `17:00:00`)
- `hora_fin` (ej. `19:00:00`)
- `dias_semana` (ej. `["mon","tue","wed","thu","fri"]` — null = todos)

Plus 2 campos adicionales para integrarlos con la landing:

- `destacado_en_landing` (boolean): si true, aparece como banner
  "Promo activa AHORA" en la landing pública del local.
- `productos_sugeridos` (array de producto_ids): al click en el banner,
  esos productos se agregan al carrito automáticamente.

## Endpoints

```
GET /api/v1/public/cupones/{slug}/destacados
```

Devuelve la lista de cupones que cumplen:
1. `destacado_en_landing = true`
2. `vigente` (entre fecha_desde y fecha_hasta)
3. `aplicaEnEsteMomento()` (filtra por hora/día actual)
4. `tieneCupoDisponible()` (no excedió max_usos)

Response:
```json
{
  "data": [
    {
      "id": 7,
      "codigo": "HAPPY2X1",
      "tipo": "percent",
      "valor": 50,
      "min_subtotal": 100,
      "productos_sugeridos": [12, 18],
      "hora_inicio": "17:00:00",
      "hora_fin": "19:00:00",
      "descripcion_corta": "50% OFF con HAPPY2X1"
    }
  ]
}
```

## Backend

- Migración: `2026_06_17_130000_add_horario_to_cupones.php` (aditiva).
- Modelo `Cupon`: 5 columnas nuevas + método `aplicaEnEsteMomento()` +
  scope `destacadosLanding()`.
- `CuponController@validar` ahora valida horario antes de aceptar el cupón.
- `CuponController@destacados` nuevo método público.

## Frontend (pendiente UI admin + landing)

Pendiente:
- En `/admin/cupones`, agregar campos hora_inicio/hora_fin/dias_semana
  como inputs opcionales al crear/editar cupón.
- Switch "Mostrar como banner promo en mi landing" + selector de
  productos a auto-agregar al carrito.
- En la landing pública (`/{slug}`), banner flotante arriba con la promo
  activa y botón "Aprovechar" que agrega los productos al carrito y aplica
  el código.

## Validación

`Cupon::aplicaEnEsteMomento()` evalúa:
1. Si `dias_semana` no es null, verifica que el día actual esté en la lista
   (formato `mon`, `tue`, ...).
2. Si `hora_inicio` y `hora_fin` están presentes, verifica que la hora
   actual del servidor esté dentro del rango.
3. Si ninguno está presente, devuelve `true` (cupón sin restricción horaria
   = funciona siempre).
