# Borrador — Anuncio a clientes Premium: nuevo alcance del plan ($499)

> **Estado: BORRADOR, no enviado.** El owner decide cuándo y cómo mandarlo — ver ADR-012 decisión #10. Este documento sólo prepara el texto, no ejecuta ningún envío.

## Contexto para quien lo revise antes de mandarlo

El plan Premium ($499 MXN/mes) ya incluye desde hoy (ver ADR-012) un conjunto grande de funciones nuevas de operación de salón: mesas con QR, cocina/mesero, caja con cortes, cuentas de mesa con split bill, reservaciones, gift cards, lealtad con niveles/retos, campañas de email y turnos de personal — sin cambio de precio para quien ya paga Premium.

**Antes de enviar, confirmar:**
1. ¿Ya está desplegado en producción? (no enviar el anuncio antes del deploy).
2. ¿A quién se le manda? — sugerido: sólo a locales con `plan_status` activo en `premium` (excluir trials).
3. ¿Por qué canal? — draft de abajo asume email transaccional (ya existe infraestructura de `Mail` en el proyecto), pero podría adaptarse a un anuncio in-app (`AnuncioGlobal`, ya existe ese modelo).

## Draft — Email

**Asunto:** Tu plan Premium ahora incluye operación de salón completa 🎉

---

Hola {{nombre_local}},

Tu plan Premium acaba de crecer — sin que tengas que pagar nada extra.

A partir de hoy, además de todo lo que ya tenías (POS, inventario, audit log, métricas avanzadas), tu cuenta incluye:

- **Mesas con QR propio** — tus clientes escanean, ven el menú y piden directo desde su mesa, sin esperar a que alguien los atienda.
- **Pantallas de cocina y mesero** — cada pedido pasa de nuevo → confirmado → preparando → listo → entregado, visible en tiempo real para tu equipo.
- **Caja con cortes** — abre y cierra turno de caja, con cálculo automático de varianza.
- **Cuentas de mesa** — divide la cuenta entre varias personas o combina formas de pago (efectivo + tarjeta) en un mismo cobro.
- **Reservaciones**, **gift cards**, **niveles y retos de lealtad**, **campañas de email** y **turnos de tu equipo** — todo ya activo en tu cuenta.

Entra a tu panel y busca la sección **"Salón"** en el menú lateral para empezar a configurar tus mesas.

¿Dudas? Responde este correo o entra al Centro de ayuda desde tu panel.

— El equipo de ClickToEat

---

## Draft — Banner in-app (más corto, para `AnuncioGlobal`)

**Título:** Tu Premium ya incluye operación de salón completa

**Cuerpo:** Mesas con QR, cocina, mesero, caja con cortes y más — todo activo, sin costo extra. Busca "Salón" en el menú para configurar tus mesas.

## Pendiente antes de enviar (no lo decide este documento)

- Confirmación de que ya se desplegó a producción.
- Decisión del owner sobre canal (email vs banner vs ambos) y fecha de envío.
- Revisar tono/copy final — este es un primer borrador, no texto final aprobado.
