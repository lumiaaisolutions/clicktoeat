# Guías para owners

Documentación pensada para dueños y staff de los locales — **sin tecnicismos**, lenguaje cotidiano, paso a paso.

> Si eres dev: estas guías te sirven también para entender el flujo de usuario que la API soporta. La documentación técnica está en [`../README.md`](../README.md).

## Guías disponibles

1. [**Primeros pasos**](primeros-pasos.md) — entrar al panel, configurar tu local, publicar tu landing.
2. [**Gestionar el menú**](gestionar-menu.md) — categorías, productos, extras y precios.
3. [**Recibir pedidos**](recibir-pedidos.md) — cómo te llegan los pedidos, cómo atenderlos, cómo confirmar y cerrar.
4. [**Inventario**](inventario.md) — ingredientes, recetas, ajustes y alertas de bajo stock.
5. [**Métricas**](metricas.md) — ver cuánto vendiste, qué se pidió más, ticket promedio.

## ¿Cómo entro al panel?

Ve a **https://clicktoeat.lumiaaisolutions.com/login** y entra con el email y contraseña que te dio el equipo de ClickToEat.

Si **perdiste la contraseña**: contacta al equipo de soporte (hoy no hay reset automático — pendiente).

## ¿Cómo te encuentran los clientes?

Tu local tiene una URL pública del estilo:

```
https://clicktoeat.lumiaaisolutions.com/tu-slug
```

Donde `tu-slug` es el identificador que se eligió para tu local (ejemplo: `tacos-el-gordo`, `pizza-bambino`).

Esa URL la puedes:

- Compartir en redes sociales (link en bio de Instagram, etc.).
- Imprimir como QR para pegar en mesas / ventana / mostrador → ver [`gestionar-menu.md`](gestionar-menu.md) → sección "QR".
- Poner en tu Google Maps / Facebook como sitio web.

## ¿Cómo te llegan los pedidos?

Cuando un cliente pide desde tu landing:

1. El cliente arma su pedido en tu menú.
2. Llena nombre + teléfono + dirección (si es entrega a domicilio).
3. Le da "Confirmar pedido".
4. Se abre **WhatsApp** en su celular con un mensaje pre-armado que dice todo lo que pidió, total, datos para entregar.
5. El cliente le da "Enviar" → llega a **tu WhatsApp**.
6. Tú confirmas en el panel (`/admin/pedidos`).

Ver [`recibir-pedidos.md`](recibir-pedidos.md) para el detalle.

## Roles

- **Owner** (tú, dueño): puedes hacer todo.
- **Staff** (empleados): pueden ver pedidos, cambiar estados, ajustar inventario. **No** pueden cambiar precios, productos ni branding.

Si necesitas dar de alta a un empleado: hoy contacta al equipo. (Próximamente desde el panel.)

## ¿Necesitas ayuda?

- Lee la guía que aplique.
- Si no encuentras la respuesta, contacta a soporte: `soporte@lumiaaisolutions.com` (o el canal que se defina).
