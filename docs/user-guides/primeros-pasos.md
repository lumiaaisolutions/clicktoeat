# Primeros pasos

> Para owners nuevos. Te guía desde el login hasta tener tu landing pública lista para recibir pedidos.

## Lo que necesitas tener a la mano

- ✅ Email + contraseña que te dio el equipo de ClickToEat.
- ✅ Tu **número de WhatsApp** del local (lo importante: que esté activo para recibir pedidos).
- ✅ **Logo** de tu local (imagen cuadrada, mínimo 256×256 px, formato JPG/PNG/WebP).
- ✅ **Banner** opcional (imagen horizontal para encabezado de la landing).
- ✅ **Color** principal de tu marca (en hex, ejemplo `#FF2D2D`). Si no sabes, el sistema usa rojo por default.
- ✅ Tus **horarios** semanales (qué días abres, de qué hora a qué hora).
- ✅ Tu **dirección** y tarifa de entrega (delivery_fee) si haces envío a domicilio.

## Paso 1 — Entrar al panel

1. Abre **https://clicktoeat.lumiaaisolutions.com/login**.
2. Pon tu email y contraseña.
3. Le das "Entrar".

Si te dice "Credenciales incorrectas":
- Verifica que el email esté bien escrito (sin espacios).
- Si lo intentas mal varias veces seguidas, el sistema te bloquea unos minutos. Espera y vuelve.
- Si sigue sin entrar, contacta soporte para resetear tu contraseña.

## Paso 2 — Cambia tu contraseña

Lo primero que debes hacer la primera vez:

1. Click en tu **perfil** (esquina superior derecha del panel, o menú lateral → "Perfil").
2. Sección "Cambiar contraseña".
3. Pon la actual + la nueva (mínimo 8 caracteres con letras y números).
4. Guardar.

> Las sesiones que tengas abiertas en otros dispositivos se cierran automáticamente. Sólo el actual sigue activo.

## Paso 3 — Configurar tu local (Branding)

Menú lateral → **Branding**.

### Identidad

- **Nombre** del local: como quieres que aparezca en el menú público (ej. "Tacos El Gordo").
- **Tagline** (frase corta): ej. "Los mejores tacos al pastor del barrio".

### Logo y banner

- Logo: arrastrar tu archivo al cuadro o click para seleccionar. Pesa máximo 5 MB.
- Banner: opcional. Imagen horizontal que se ve arriba de tu landing.

### Colores

- **Color primario**: el color con el que se pintan botones y badges. Click en el cuadrito para elegir.
- **Color secundario**: tipografía principal.
- **Color de fondo**: fondo general de la landing.

> Vista previa lateral muestra cómo se va a ver mientras editas.

### Tipografía

Selecciona una fuente del listado. Default "Bricolage Grotesque" — moderna y legible.

### Contacto

- **WhatsApp**: tu número con código de país, sólo dígitos. Ejemplo: `5215512345678` (52 = México, 1 = celular, 55 = ciudad, etc.).
- **Teléfono fijo**: opcional.
- **Email de contacto**: opcional.
- **Dirección**: la del local. Si tu cliente quiere ir a recoger, le va a aparecer.

### Ubicación en mapa

Si haces delivery: pon tu **lat/lng**. Hay un mini-mapa donde puedes arrastrar el marcador o buscar tu dirección.

> Esto se usa para validar que la dirección del cliente está dentro de tu radio de entrega.

### Entrega (delivery)

- **Tarifa de envío**: cuánto le cobras al cliente por delivery (ejemplo: $35).
- **Tiempo mínimo** estimado en minutos.
- **Radio de entrega** en km: máximo a cuánta distancia haces entrega.

### Métodos de pago aceptados

Marcas qué métodos aceptas:

- ✅ Efectivo
- ✅ Tarjeta a la entrega
- ✅ Transferencia

Sólo aparecen al cliente los que marques.

### Redes sociales

Pon tus handles (sólo el usuario, no la URL completa):

- Instagram → "tacosgordo" (sin @)
- Facebook → "TacosElGordoMX"
- TikTok → "tacosgordo"

> Guarda los cambios. Tu landing pública se actualiza al instante.

## Paso 4 — Horarios

Menú lateral → **Horarios**.

Para cada día de la semana:

- ✅ Marca si abres.
- ⏰ Hora de apertura y cierre, formato 24h (ejemplo: `12:00` a `23:00`).

Si cierras a las 2 AM del día siguiente (típico bar), pon `19:00` a `02:00` — el sistema lo entiende como "cierra cruzando medianoche".

### Cerrado temporal

Switch arriba: **"Cerrado temporalmente"**.

Úsalo cuando:
- Estás en vacaciones.
- Te quedaste sin un ingrediente clave.
- Cualquier razón para no aceptar pedidos sin cambiar tu horario.

Mientras esté activado, la landing pública muestra "Cerrado temporalmente" y **rechaza pedidos nuevos**. Tu menú sigue visible, sólo no se puede confirmar.

### Zona horaria

Default: `America/Mexico_City`. Cámbialo sólo si tu local está en otra zona (Cancún = `America/Cancun`, Tijuana = `America/Tijuana`).

## Paso 5 — Crear tu primer producto

Menú lateral → **Productos**.

Antes necesitas una **categoría** (Tacos, Bebidas, Postres, etc.):

1. **Categorías** → "Nueva categoría" → nombre + ícono (opcional) → Guardar.

Luego el producto:

1. **Productos** → "Nuevo producto".
2. Selecciona la categoría.
3. Nombre + descripción + precio.
4. Sube la imagen (botón "Subir imagen" — usa la misma mecánica que el logo).
5. Marca si está **disponible** (si no, aparece en gris al cliente o se oculta).
6. Si tiene **extras** (ej. tipo de tortilla, salsas), agrégalos:
   - Grupo: "Tortilla", "Salsas", etc.
   - Tipo: "Uno solo" (radio) o "Varios" (checkbox).
   - Opciones: cada una con nombre y precio adicional (0 si no cobra extra).
7. Guardar.

> Ver más en [`gestionar-menu.md`](gestionar-menu.md).

## Paso 6 — Publica el QR de tu menú

Menú lateral → **QR**.

- Aparece tu URL pública + un QR generado.
- Click "Descargar PNG" → imprime y pega en mesas, mostrador, ventana.

Cuando alguien escanee con la cámara del celular, abre tu landing.

## Paso 7 — Prueba el flujo

1. Abre **tu URL pública** en tu celular o en una ventana incógnito del navegador (`https://clicktoeat.lumiaaisolutions.com/tu-slug`).
2. Agrega productos al carrito.
3. Click "Confirmar pedido".
4. Llena datos.
5. Da "Enviar" → debería abrirse WhatsApp con un mensaje pre-armado.

Si no se abre WhatsApp:
- Verifica que tu número de WhatsApp en branding tenga código de país completo y sólo dígitos.
- Verifica que ese número tenga WhatsApp instalado y activo.

## Paso 8 — Recibe el pedido en el panel

El pedido que armaste de prueba ya está en el panel:

1. Menú lateral → **Pedidos**.
2. Aparece como "Nuevo".
3. Click → ves el detalle.

Para qué hacer con el pedido → [`recibir-pedidos.md`](recibir-pedidos.md).

---

## ¿Qué sigue?

- [Gestionar el menú](gestionar-menu.md) — categorías, productos con extras, foto.
- [Recibir pedidos](recibir-pedidos.md) — estados, cancelaciones, atención.
- [Inventario](inventario.md) — control de stock automático cuando recibes pedidos.
- [Métricas](metricas.md) — interpretar las ventas.

## Errores comunes en el setup

| Síntoma                              | Causa probable                        | Solución                                |
|--------------------------------------|--------------------------------------|----------------------------------------|
| La landing dice "Cerrado"            | No hay horarios o `cerrado_temporal` activo | Verifica Horarios + el switch         |
| El cliente no puede confirmar        | Local sin métodos de pago aceptados   | Branding → marca al menos uno         |
| La imagen no aparece                  | Subiste pero no guardaste             | Click "Guardar" después de subir       |
| WhatsApp no abre                      | Número sin código país                 | Branding → pon número completo (`52155...`) |
| El producto no aparece en la landing  | `disponible` desactivado o categoría inactiva | Productos → switch "Disponible"     |
| La dirección sale del radio           | `delivery_radio_km` muy chico         | Branding → sube el radio              |
