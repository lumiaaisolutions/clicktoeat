/**
 * Catálogo de tours interactivos por módulo del admin.
 *
 * Cada tour es una lista de pasos. Cada paso apunta a un selector DOM
 * (`data-tour="..."`) que se resaltará y describirá. Si el selector no
 * existe en la página, el paso se salta silenciosamente.
 *
 * Para agregar un tour nuevo:
 *  1. Define el slug aquí.
 *  2. Pega `data-tour="..."` en los elementos relevantes de tu página.
 *  3. El botón "?" del header (vía `<AdminPageHeader tourSlug="...">`) lo
 *     dispara automáticamente la primera vez que el user entra.
 *
 * Iconos vienen del componente `<Icon>` (no emojis) para mantener
 * consistencia visual con el resto del sistema.
 */

import type { IconName } from '@/components/ui/Icon';
import type { TourIllustrationName } from './TourIllustration';

export interface TourStep {
  /** Selector CSS del elemento a resaltar. Vacío = paso sin highlight (centro de pantalla). */
  target?: string;
  /** Título del tooltip. */
  title: string;
  /** Descripción corta, máx 2 líneas. */
  body: string;
  /**
   * Cuando es `true` (y hay `target`), el overlay deja el elemento
   * realmente clickeable — recorta el backdrop alrededor del target en
   * vez de taparlo, y clickear el elemento real avanza el tour solo. Úsalo
   * en pasos donde quieres que el usuario abra de verdad un modal/acción
   * (ej. "+ Nuevo producto") para que el siguiente paso pueda apuntar a
   * algo que sólo existe una vez abierto. Si el usuario no clickea y usa
   * "Siguiente" igual, el paso siguiente simplemente no encuentra su
   * target y se muestra centrado (degradación silenciosa, ver abajo).
   */
  interactive?: boolean;
  /** Posición del tooltip respecto al target. */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Icono decorativo (componente <Icon>) — viene del set Lucide-like. */
  icon?: IconName;
  /** URL opcional de un video MP4 / webm corto (≤30s) que muestra cómo
   *  hacer la acción. Se renderiza arriba del body del tooltip. */
  video?: string;
  /** Alternativa: URL de un GIF/PNG estático. */
  image?: string;
  /** Ilustración SVG inline animada (sin assets externos). Prioridad sobre video/image. */
  illustration?: TourIllustrationName;
}

export const TOURS: Record<string, TourStep[]> = {
  /* ── Bienvenida general — auto-trigger al primer login ── */
  bienvenida: [
    {
      title: '¡Bienvenido a ClickToEat!',
      body: 'Este es tu panel para administrar tu local. Te voy a guiar por lo más importante en 4 pasos.',
      placement: 'center',
      icon: 'utensils',
      illustration: 'pedido',
    },
    {
      target: '[data-tour="sidebar-productos"]',
      title: 'Tu menú',
      body: 'Empieza por crear tus categorías (Postres, Bebidas, etc) y luego tus productos con foto y precio.',
      placement: 'right',
      icon: 'package',
    },
    {
      target: '[data-tour="sidebar-pedidos"]',
      title: 'Tus pedidos',
      body: 'Acá aparecen los pedidos que recibes desde tu landing pública. Los aceptas y los entregas.',
      placement: 'right',
      icon: 'bell',
    },
    {
      target: '[data-tour="sidebar-branding"]',
      title: 'Tu identidad',
      body: 'Sube tu logo, banner y elige tus colores. Así tu landing pública va a verse como tu marca.',
      placement: 'right',
      icon: 'palette',
    },
    {
      target: '[data-tour="sidebar-qr"]',
      title: 'Tu código QR',
      body: 'Imprime este QR y póngalo en barra/mesa/vitrina. Tus clientes escanean → piden por WhatsApp.',
      placement: 'right',
      icon: 'qr-code',
    },
  ],

  productos: [
    {
      title: 'Aquí gestionas tu menú',
      body: 'Cada producto que crees aparece automáticamente en tu landing pública. Ten foto y precio actualizados — te voy a llevar paso a paso por todo el flujo.',
      placement: 'center',
      icon: 'pizza',
      illustration: 'menu',
    },
    {
      target: '[data-tour="producto-search-input"]',
      title: 'Busca por nombre',
      body: 'Si ya tienes muchos productos, escribe aquí para filtrar la lista al instante.',
      placement: 'bottom',
      icon: 'search',
    },
    {
      target: '[data-tour="producto-filtro-categoria"]',
      title: 'Agrupar por categoría',
      body: 'Elige una categoría para ver solo esos productos. Déjalo en "Agrupar por categoría" para ver todo organizado en secciones plegables.',
      placement: 'bottom',
      icon: 'list',
    },
    {
      target: '[data-tour="producto-toggle-disponible"]',
      title: '● Disponible / ○ Oculto',
      body: 'Este chip en cada fila pausa el producto de tu landing en 1 click, sin borrarlo — útil cuando se agota algo.',
      placement: 'top',
      icon: 'zap',
    },
    {
      target: '[data-tour="producto-receta"]',
      title: 'Receta',
      body: 'Conecta este producto con tu inventario: cada venta descuenta automáticamente los ingredientes que definas. Requiere tener ingredientes cargados en Inventario primero.',
      placement: 'top',
      icon: 'truck',
    },
    {
      target: '[data-tour="producto-editar"]',
      title: 'Editar',
      body: 'Abre el mismo formulario de creación, con los datos actuales para modificar.',
      placement: 'top',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="producto-borrar"]',
      title: 'Borrar',
      body: 'Pide confirmación. El producto desaparece de la landing, pero el histórico de pedidos que ya lo incluían NO se altera.',
      placement: 'top',
      icon: 'x',
    },
    {
      target: '[data-tour="productos-nuevo"]',
      title: 'Crear un producto',
      body: 'Vamos a abrirlo de verdad — te voy marcando cada campo del formulario.',
      placement: 'left',
      icon: 'plus',
      interactive: true,
    },
    {
      target: '[data-tour="producto-modal-imagen"]',
      title: 'Foto del producto',
      body: 'Una foto real aumenta las ventas. Formatos JPG/PNG/WebP, se recorta cuadrada automáticamente.',
      placement: 'right',
      icon: 'camera',
    },
    {
      target: '[data-tour="producto-modal-nombre"]',
      title: 'Nombre',
      body: 'Como lo va a ver tu cliente en la landing. Sé claro y corto: "Pizza Pepperoni", no "PZZ PEP GDE".',
      placement: 'right',
      icon: 'utensils',
    },
    {
      target: '[data-tour="producto-modal-categoria"]',
      title: 'Categoría',
      body: 'Elige a qué sección pertenece (Postres, Bebidas...). Si necesitas una nueva, créala primero desde Categorías.',
      placement: 'right',
      icon: 'list',
    },
    {
      target: '[data-tour="producto-modal-precio"]',
      title: 'Precio',
      body: 'En pesos MXN, sin comisiones — ClickToEat no cobra porcentaje por venta.',
      placement: 'right',
      icon: 'card',
    },
    {
      target: '[data-tour="producto-modal-disponible"]',
      title: 'Disponible',
      body: 'Apágalo para ocultarlo temporalmente de la landing sin borrarlo (útil si se te acabó un ingrediente).',
      placement: 'top',
      icon: 'zap',
    },
    {
      target: '[data-tour="producto-modal-extras"]',
      title: 'Extras y toppings (opcional)',
      body: 'Agrega grupos de opciones — "Tamaño" (elige 1) o "Toppings" (elige varios) — cada uno con su propio precio extra. El cliente los ve al armar su pedido.',
      placement: 'top',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="producto-modal-guardar"]',
      title: 'Guardar',
      body: 'Al guardar, el producto aparece de inmediato en tu landing pública — no hay paso de "publicar" aparte.',
      placement: 'top',
      icon: 'check',
    },
  ],

  categorias: [
    {
      title: 'Categorías de tu menú',
      body: 'Agrupa tus productos: Postres, Bebidas, Entradas... Aparecen como tabs en tu landing pública. Créalas ANTES de crear productos — cada producto necesita una categoría.',
      placement: 'center',
      icon: 'list',
    },
    {
      target: '[data-tour="categoria-editar"]',
      title: 'Editar',
      body: 'Cambia nombre, icono u orden en cualquier momento — los productos ya asignados no se mueven de categoría solos.',
      placement: 'top',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="categoria-borrar"]',
      title: 'Borrar',
      body: 'Si la categoría tiene productos, primero muévelos o bórralos a ellos — no puedes borrar una categoría con productos activos.',
      placement: 'top',
      icon: 'x',
    },
    {
      target: '[data-tour="categorias-nuevo"]',
      title: 'Crear categoría',
      body: 'Vamos a abrir el formulario de verdad.',
      placement: 'left',
      icon: 'plus',
      interactive: true,
    },
    {
      target: '[data-tour="categoria-modal-nombre"]',
      title: 'Nombre',
      body: 'Ej. "Postres", "Bebidas frías", "Entradas". Aparece tal cual como tab en tu landing.',
      placement: 'right',
      icon: 'utensils',
    },
    {
      target: '[data-tour="categoria-modal-icono"]',
      title: 'Icono',
      body: 'Ayuda a tus clientes a identificar la sección de un vistazo. Elige el que más se parezca a lo que vendes.',
      placement: 'right',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="categoria-modal-guardar"]',
      title: 'Guardar',
      body: 'Al guardar, ya puedes ir a Productos y asignarle platillos a esta categoría.',
      placement: 'top',
      icon: 'check',
    },
  ],

  pedidos: [
    {
      title: 'Tus pedidos en vivo',
      body: 'Cada vez que un cliente pide por WhatsApp, aparece aquí en una tarjeta visual. Se actualiza solo cada 30 segundos — no necesitas refrescar la página.',
      placement: 'center',
      icon: 'bell',
      illustration: 'pedido',
    },
    {
      target: '[data-tour="pedidos-filtro-estado"]',
      title: 'Filtra por estado',
      body: 'Ve solo los "nuevo", solo "en preparación", etc. Útil cuando tienes muchos pedidos activos a la vez.',
      placement: 'bottom',
      icon: 'list',
    },
    {
      target: '[data-tour="pedido-estado"]',
      title: 'Chip "Estado"',
      body: 'Avanza el pedido en su flujo: nuevo → confirmado → preparando → listo → entregado. Si te equivocas, dentro también hay botones "←" para retroceder (piden confirmación extra). Solo aparece si el pedido no está entregado ni cancelado.',
      placement: 'top',
      icon: 'settings',
    },
    {
      target: '[data-tour="pedido-calificacion"]',
      title: 'Pedir calificación',
      body: 'Cuando un pedido llega a "entregado" aparece este botón — genera un link único y lo abre directo en WhatsApp del cliente para que te califique 1-5 estrellas.',
      placement: 'top',
      icon: 'star',
    },
    {
      target: '[data-tour="pedido-borrar"]',
      title: 'Borrar definitivo',
      body: 'Para pedidos de prueba o erróneos. Pide doble confirmación y NO se puede restaurar. Para pedidos reales que no se van a entregar, mejor avanza el estado a "cancelado" en vez de borrar — así conservas el histórico.',
      placement: 'top',
      icon: 'x',
    },
    {
      target: '[data-tour="pedido-card"]',
      title: 'Toca cualquier tarjeta',
      body: 'Ábrela para ver el detalle completo: cliente, teléfono, dirección o "recoger en sucursal", cada item con sus extras elegidos, y el botón para reenviar el mensaje de WhatsApp original.',
      placement: 'top',
      icon: 'utensils',
      interactive: true,
    },
  ],

  inventario: [
    {
      title: 'Control de stock',
      body: 'Registra tus ingredientes (harina, queso, etc). Cuando los conectas a una Receta en Productos, cada venta descuenta el stock automáticamente.',
      placement: 'center',
      icon: 'truck',
      illustration: 'inventario',
    },
    {
      target: '[data-tour="inventario-bajo-stock"]',
      title: 'Bajo stock',
      body: 'Filtra solo los ingredientes que están por debajo de su mínimo — tu lista de compras urgente.',
      placement: 'bottom',
      icon: 'zap',
    },
    {
      target: '[data-tour="inventario-nuevo"]',
      title: 'Registrar un ingrediente',
      body: 'Vamos a abrir el formulario de verdad.',
      placement: 'left',
      icon: 'plus',
      interactive: true,
    },
    {
      target: '[data-tour="inventario-modal-nombre"]',
      title: 'Nombre',
      body: 'Ej. "Queso mozzarella", "Harina de trigo". Este nombre es interno, tus clientes no lo ven.',
      placement: 'right',
      icon: 'truck',
    },
    {
      target: '[data-tour="inventario-modal-stock"]',
      title: 'Stock actual',
      body: 'Cuánto tienes ahora mismo, en la unidad que elijas (pz, kg, g, l, ml). Este número baja solo cuando conectes el ingrediente a una receta y se venda el producto.',
      placement: 'right',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="inventario-modal-minimo"]',
      title: 'Stock mínimo',
      body: 'Cuando el stock cae por debajo de este número, aparece marcado como "bajo" en rojo — tu señal para reabastecer.',
      placement: 'right',
      icon: 'zap',
    },
    {
      target: '[data-tour="inventario-modal-guardar"]',
      title: 'Guardar',
      body: 'Ya puedes ir a un producto → botón "Receta" y decirle cuánto de este ingrediente consume cada venta.',
      placement: 'top',
      icon: 'check',
    },
    {
      target: '[data-tour="inventario-historial"]',
      title: 'Historial',
      body: 'Te lleva a una pantalla con todos los movimientos de este ingrediente — entradas, mermas, ajustes y descuentos automáticos por venta.',
      placement: 'top',
      icon: 'history',
    },
    {
      target: '[data-tour="inventario-editar"]',
      title: 'Editar',
      body: 'Cambia nombre, unidad, mínimo o costo. El stock actual también se puede editar aquí, pero para movimientos normales usa mejor "Ajustar" (queda registrado en el historial).',
      placement: 'top',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="inventario-ajustar"]',
      title: 'Ajustar stock',
      body: 'Vamos a abrirlo — así sumas una compra, restas una merma, o corriges el número a mano.',
      placement: 'top',
      icon: 'sparkles',
      interactive: true,
    },
    {
      target: '[data-tour="inventario-ajuste-tipo"]',
      title: 'Tipo de movimiento',
      body: '"Entrada" suma (te llegó mercancía), "Merma" resta (se echó a perder o se rompió), "Ajuste manual" corrige a lo que realmente tienes tras un conteo físico.',
      placement: 'right',
      icon: 'settings',
    },
    {
      target: '[data-tour="inventario-ajuste-cantidad"]',
      title: 'Cantidad',
      body: 'Verás en tiempo real el "Nuevo stock" resultante antes de confirmar.',
      placement: 'right',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="inventario-ajuste-confirmar"]',
      title: 'Confirmar',
      body: 'Cada ajuste queda registrado en el Historial de ese ingrediente, con quién lo hizo y cuándo.',
      placement: 'top',
      icon: 'check',
    },
  ],

  compras: [
    {
      title: 'Compras a proveedor',
      body: 'Registra lo que compras para llevar el costo unitario actualizado con promedio ponderado.',
      placement: 'center',
      icon: 'truck',
    },
  ],

  branding: [
    {
      title: 'Personaliza tu landing',
      body: 'Tu logo, colores, fotos. Todo lo que tu cliente ve al abrir tu URL pública, en tiempo real conforme editas.',
      placement: 'center',
      icon: 'palette',
      illustration: 'colores',
    },
    {
      target: '[data-tour="branding-logo"]',
      title: 'Logo y banner',
      body: 'El logo aparece grande y centrado en el hero de tu landing. El banner es el fondo detrás (más sutil, menos protagonismo). JPG, PNG o WebP, máx 5 MB cada uno.',
      placement: 'bottom',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="branding-colores"]',
      title: 'Color de tu marca',
      body: 'Toca el cuadro de color para elegir el tuyo o escribe el código hex directo. Las paletas sugeridas debajo te dan un punto de partida con combinaciones ya probadas.',
      placement: 'bottom',
      icon: 'sparkles',
    },
    {
      title: '¿Tienes servicio a domicilio?',
      body: 'Más abajo en esta página, activa el switch "¿Cuentas con servicio a domicilio?". Si lo apagas, tu landing solo ofrece "Recoger en sucursal" y se ocultan los campos de envío/radio de entrega.',
      placement: 'center',
      icon: 'truck',
    },
    {
      title: 'Guardar cambios',
      body: 'El botón "Guardar" queda fijo abajo de la página. Hasta que no lo toques, los cambios son solo una vista previa — tu landing pública sigue mostrando la versión anterior.',
      placement: 'center',
      icon: 'check',
    },
  ],

  qr: [
    {
      title: 'Tu código QR único',
      body: 'Descarga, imprime y pégalo donde tus clientes lo vean. Al escanear, abren tu landing directo — sin apps, sin fricción.',
      placement: 'center',
      icon: 'qr-code',
      illustration: 'qr',
    },
    {
      target: '[data-tour="qr-preview"]',
      title: 'Vista previa imprimible',
      body: 'Esto es exactamente lo que se descarga o imprime — el nombre de tu local, el QR y tu tagline, ya con tus colores.',
      placement: 'right',
      icon: 'qr-code',
    },
    {
      target: '[data-tour="qr-tema"]',
      title: 'Elige el tema',
      body: '"Tu marca" usa los colores de tu Branding automáticamente. "Blanco y negro" es el más seguro para imprimir en cualquier impresora. "Personalizado" te deja elegir cualquier combinación.',
      placement: 'left',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="qr-descargar"]',
      title: 'Descargar PNG',
      body: 'Alta resolución (1200px) — el recomendado si vas a imprimir en lona, póster o vinil grande.',
      placement: 'left',
      icon: 'download',
    },
    {
      target: '[data-tour="qr-imprimir"]',
      title: 'Imprimir',
      body: 'Abre el diálogo de impresión de tu navegador con la tarjeta ya formateada para hoja carta/A4.',
      placement: 'left',
      icon: 'qr-code',
    },
    {
      target: '[data-tour="qr-copiar"]',
      title: 'Copiar link',
      body: 'Copia la URL de tu landing (sin el QR) — útil para pegarla en tu bio de Instagram o WhatsApp Business.',
      placement: 'left',
      icon: 'copy',
    },
  ],

  horarios: [
    {
      title: 'Cuándo aceptas pedidos',
      body: 'Define tus horarios por día. Fuera de horario, tu landing muestra "Cerrado".',
      placement: 'center',
      icon: 'clock',
      illustration: 'horarios',
    },
  ],

  staff: [
    {
      title: 'Tu equipo',
      body: 'Invita a personas para que te ayuden a recibir pedidos y administrar inventario. Cada cuenta tiene su propio correo y contraseña — nunca compartas la tuya.',
      placement: 'center',
      icon: 'users',
      illustration: 'staff',
    },
    {
      target: '[data-tour="staff-editar"]',
      title: 'Editar',
      body: 'Cambia el rol, los permisos o resetea la contraseña de un empleado. No puedes editarte a ti mismo desde aquí — eso se hace en Perfil.',
      placement: 'left',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="staff-borrar"]',
      title: 'Eliminar',
      body: 'Corta el acceso de inmediato — todas sus sesiones activas se cierran al instante.',
      placement: 'left',
      icon: 'x',
    },
    {
      target: '[data-tour="staff-nuevo"]',
      title: 'Agregar miembro',
      body: 'Vamos a abrir el formulario de verdad.',
      placement: 'left',
      icon: 'plus',
      interactive: true,
    },
    {
      target: '[data-tour="staff-modal-nombre"]',
      title: 'Nombre y correo',
      body: 'El correo es su usuario para entrar al panel — asegúrate de que sea uno al que tenga acceso.',
      placement: 'bottom',
      icon: 'utensils',
    },
    {
      target: '[data-tour="staff-modal-password"]',
      title: 'Contraseña',
      body: 'Mínimo 8 caracteres con letras y números. Compártesela por un medio seguro — no queda visible después de crear la cuenta.',
      placement: 'bottom',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="staff-modal-roles"]',
      title: 'Rol predefinido',
      body: 'La forma más rápida: elige "Cajero", "Encargado de cocina" o "Manager" y ya trae los módulos correctos preseleccionados. "Personalizado" te deja armar el set exacto tú mismo.',
      placement: 'top',
      icon: 'shield',
    },
    {
      target: '[data-tour="staff-modal-permisos"]',
      title: 'Acceso a módulos',
      body: 'Marca exactamente qué secciones del panel puede ver esta persona. Si eliges un rol predefinido, esto se llena solo — pero puedes ajustarlo módulo por módulo.',
      placement: 'top',
      icon: 'shield',
    },
    {
      target: '[data-tour="staff-modal-guardar"]',
      title: 'Crear empleado',
      body: 'Al crear, ya puede entrar a /login con su correo y contraseña y va a ver solo los módulos que le diste.',
      placement: 'top',
      icon: 'check',
    },
  ],

  metricas: [
    {
      title: 'Tus números del día',
      body: 'Ventas, ticket promedio, productos más pedidos. Todo actualizado en tiempo real.',
      placement: 'center',
      icon: 'chart',
      illustration: 'metricas',
    },
  ],

  'audit-log': [
    {
      title: 'Historial de cambios',
      body: 'Quién hizo qué y cuándo. Útil cuando necesitas saber por qué cambió el precio de un producto.',
      placement: 'center',
      icon: 'history',
    },
  ],

  billing: [
    {
      title: 'Tu suscripción',
      body: 'Acá ves tu plan actual, cuánto te falta del trial y puedes cambiar tu método de pago o de plan.',
      placement: 'center',
      icon: 'card',
    },
    {
      target: '[data-tour="billing-cta"]',
      title: 'Cambiar plan / método de pago',
      body: 'Te lleva al portal seguro de Stripe (fuera de ClickToEat) — ahí agregas o cambias tu tarjeta. Nosotros nunca vemos ni guardamos tu número de tarjeta.',
      placement: 'bottom',
      icon: 'card',
    },
    {
      target: '[data-tour="billing-limites"]',
      title: 'Límites de tu plan',
      body: 'Cuántos productos, categorías y cuentas de staff puedes tener. Si llegas al límite, el sistema te avisa al intentar crear uno más — no se bloquea nada sin avisarte antes.',
      placement: 'right',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="billing-modulos"]',
      title: 'Módulos incluidos',
      body: 'Todo lo que tu plan actual desbloquea. Si te falta algo de la lista, bájate a la sección de abajo para subir de plan.',
      placement: 'left',
      icon: 'shield',
    },
    {
      target: '[data-tour="billing-upgrade"]',
      title: 'Cambiar a otro plan',
      body: 'Compara los planes disponibles y cambia con 1 click — el cobro se prorratea automáticamente, no pagas doble.',
      placement: 'top',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="billing-cancelar"]',
      title: '¿Pensando en cancelar?',
      body: 'Antes de irte, cuéntanos por qué — a veces el problema tiene solución rápida. Si decides cancelar, mantienes acceso completo hasta el fin del periodo ya pagado.',
      placement: 'top',
      icon: 'message-circle',
    },
  ],

  'punto-venta': [
    {
      title: 'Caja en sucursal',
      body: 'Para cobrar a clientes que pagan en el local. Crea el pedido y registra el cobro en pocos toques.',
      placement: 'center',
      icon: 'cup-soda',
    },
    {
      title: 'Filtra por categoría',
      body: 'Usa los chips o el desplegable "Todas las categorías" para encontrar rápido lo que tu cliente pide.',
      placement: 'center',
      icon: 'list',
    },
    {
      title: 'Agregar al pedido',
      body: 'Toca cualquier producto: se abre un modal con foto, descripción, opciones (si tiene toppings) y un selector +/− para elegir cantidad antes de agregar.',
      placement: 'center',
      icon: 'plus',
    },
    {
      title: 'Cobrar',
      body: 'En el panel derecho ajustas cantidades, escribes nombre del cliente y eliges método de pago. Confirmar cobro genera el ticket listo para imprimir o descargar.',
      placement: 'center',
      icon: 'card',
    },
    {
      title: 'Funciona sin internet',
      body: 'Si se cae la red, el POS sigue cobrando localmente. Cuando vuelva el internet, los pedidos se sincronizan automáticamente.',
      placement: 'center',
      icon: 'shield',
    },
  ],

  /* ── F100: Cupones por horario (happy hour, 2x1) ── */
  'cupones-horario': [
    {
      title: 'Cupones con horario automático',
      body: 'Crea promociones que se activan solas: 2x1 cervezas miércoles 5-7pm, combo del día, etc.',
      placement: 'center',
      icon: 'sparkles',
    },
    {
      title: 'Configura el horario',
      body: 'En el form del cupón, activa "Horario" y elige hora desde/hasta + días de la semana (L M X J V S D).',
      placement: 'center',
      icon: 'clock',
    },
    {
      title: 'Aparece en tu landing',
      body: 'Activa "Mostrar como banner en mi landing pública" y elige los productos que se agregan al carrito al tocarlo. El cliente lo ve activo SOLO en el horario configurado.',
      placement: 'center',
      icon: 'storefront',
    },
  ],

  /* ── F100: Reviews / calificaciones del local ── */
  reviews: [
    {
      title: 'Calificaciones de tus clientes',
      body: 'Después de cada pedido entregado, generamos un link único para que el cliente te califique 1-5 estrellas.',
      placement: 'center',
      icon: 'star',
    },
    {
      title: 'Manda el link',
      body: 'En /admin/pedidos toca el chip "⭐ Link de calificación" en un pedido entregado para copiar el link y mandarlo al cliente por WhatsApp.',
      placement: 'center',
      icon: 'message-circle',
    },
    {
      title: 'Aparecen en tu landing',
      body: 'Las calificaciones aprobadas se muestran abajo de tu menú con el promedio. Aquí puedes ocultar las que no te interesan.',
      placement: 'center',
      icon: 'storefront',
    },
  ],

  /* ── F100: Centro de aprendizaje ── */
  'centro-aprendizaje': [
    {
      title: 'Aprende a usar el panel',
      body: '6 lecciones cortas con animaciones que te muestran exactamente cómo hacer cada cosa. Sin videos, sin manuales.',
      placement: 'center',
      icon: 'sparkles',
    },
    {
      title: 'Toca cualquier lección',
      body: 'Se abre un modal con la animación + pasos numerados + botón directo al módulo.',
      placement: 'center',
      icon: 'play',
    },
  ],

  /* ── F100: Inventario auto-pause ── */
  'inventario-auto-pause': [
    {
      title: 'Pausa automática de productos sin stock',
      body: 'Cuando un ingrediente se agota, los productos que lo usan se marcan como "agotado" en tu landing automáticamente. Cero pedidos imposibles.',
      placement: 'center',
      icon: 'package',
    },
    {
      title: 'Te llega un correo',
      body: 'Recibes notificación in-app + correo cuando algo se agota o cuando un ingrediente cruza el umbral mínimo de stock.',
      placement: 'center',
      icon: 'bell',
    },
  ],
  /* ── F100e: Sucursales (página informativa del plan Premium) ── */
  sucursales: [
    {
      title: 'Administra varias sucursales',
      body: 'Si tu cadena crece, agregamos cada sucursal a tu cuenta y las administras desde un mismo panel con el switcher arriba del sidebar.',
      placement: 'center',
      icon: 'store',
    },
    {
      title: 'Alta con apoyo de soporte',
      body: 'Mándanos un mensaje con el nombre, dirección y WhatsApp de la nueva sucursal. La dejamos lista en menos de 24h. Disponible en plan Premium.',
      placement: 'center',
      icon: 'message-circle',
    },
  ],

  /* ── Multi-sucursal — explica el LocalSwitcher cuando el user tiene más de un local ── */
  'multi-sucursal': [
    {
      title: 'Tienes varias sucursales',
      body: 'Cuando un mismo dueño administra más de un local, puedes saltar entre ellas sin cerrar sesión.',
      placement: 'center',
      icon: 'store',
    },
    {
      target: '[data-tour="local-switcher"]',
      title: 'Cambia de sucursal',
      body: 'Toca esta tarjeta y elige otra sucursal. Todo el panel se recarga con los datos de la sucursal nueva: productos, pedidos, métricas.',
      placement: 'right',
      icon: 'store',
    },
    {
      title: 'Datos separados',
      body: 'Cada sucursal tiene su propio menú, sus pedidos y su contabilidad. Los cambios que hagas en una NO afectan a las otras.',
      placement: 'center',
      icon: 'shield',
    },
  ],
};

export function getTour(slug: string): TourStep[] | null {
  return TOURS[slug] ?? null;
}
