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
      body: 'Cada producto que crees aparece automáticamente en tu landing pública. Ten foto y precio actualizados.',
      placement: 'center',
      icon: 'pizza',
      illustration: 'menu',
    },
    {
      target: '[data-tour="productos-nuevo"]',
      title: 'Crear un producto',
      body: 'Click acá para agregar un platillo nuevo. Necesitas: nombre, categoría, precio y (opcional) foto.',
      placement: 'left',
      icon: 'plus',
    },
    {
      target: '[data-tour="productos-buscar"]',
      title: 'Búsqueda rápida',
      body: 'Si tienes muchos productos, busca por nombre o filtra por categoría.',
      placement: 'bottom',
      icon: 'search',
    },
  ],

  categorias: [
    {
      title: 'Categorías de tu menú',
      body: 'Agrupa tus productos: Postres, Bebidas, Entradas... Aparecen como tabs en tu landing pública.',
      placement: 'center',
      icon: 'list',
    },
    {
      target: '[data-tour="categorias-nuevo"]',
      title: 'Crear categoría',
      body: 'Cada categoría tiene un icono que ayuda a tus clientes a identificarla rápido.',
      placement: 'left',
      icon: 'plus',
    },
  ],

  pedidos: [
    {
      title: 'Tus pedidos en vivo',
      body: 'Cada vez que un cliente pide por WhatsApp, aparece aquí en una tarjeta visual. Confirma, prepara, entrega.',
      placement: 'center',
      icon: 'bell',
      illustration: 'pedido',
    },
    {
      target: '[data-tour="pedidos-filtros"]',
      title: 'Filtros',
      body: 'Filtra por estado (nuevos, preparación, entregados) o muestra solo eliminados.',
      placement: 'bottom',
      icon: 'list',
    },
    {
      title: 'Cambia el estado',
      body: 'En cada tarjeta el chip "Estado" abre el detalle. Avanza el flujo (nuevo → confirmado → preparando → listo → entregado) o retrocede si te equivocaste.',
      placement: 'center',
      icon: 'settings',
    },
    {
      title: 'Calificación del cliente',
      body: 'Al entregar un pedido aparece el botón "Calificación" — abre un modal con WhatsApp directo: 1 click manda al cliente un link para que te califique.',
      placement: 'center',
      icon: 'star',
    },
    {
      title: 'Borrar definitivo',
      body: 'Para pedidos de prueba o erróneos usa el botón rojo "Borrar". Pide doble confirmación y NO se restaura. Para pedidos reales mejor marca como "cancelado".',
      placement: 'center',
      icon: 'x',
    },
  ],

  inventario: [
    {
      title: 'Control de stock',
      body: 'Registra tus ingredientes (harina, queso, etc) y conecta con recetas para descontar al vender.',
      placement: 'center',
      icon: 'truck',
      illustration: 'inventario',
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
      body: 'Tu logo, colores, fotos. Todo lo que tu cliente ve al abrir tu URL pública.',
      placement: 'center',
      icon: 'palette',
      illustration: 'colores',
    },
    {
      target: '[data-tour="branding-logo"]',
      title: 'Logo y banner',
      body: 'El logo aparece grande y centrado en el hero. El banner es el fondo (más sutil).',
      placement: 'bottom',
      icon: 'sparkles',
    },
    {
      target: '[data-tour="branding-colores"]',
      title: 'Color de tu marca',
      body: 'Toca el cuadro de color para elegir el tuyo o escribe el código hex directo. Las paletas sugeridas te dan un punto de partida.',
      placement: 'bottom',
      icon: 'sparkles',
    },
    {
      title: '¿Tienes servicio a domicilio?',
      body: 'Activa el switch "¿Cuentas con servicio a domicilio?". Si lo apagas, tu landing solo ofrece "Recoger en sucursal" y se ocultan los campos de envío.',
      placement: 'center',
      icon: 'truck',
    },
  ],

  qr: [
    {
      title: 'Tu código QR único',
      body: 'Descarga, imprime y pégalo donde tus clientes lo vean. Al escanear, abren tu landing.',
      placement: 'center',
      icon: 'qr-code',
      illustration: 'qr',
    },
    {
      target: '[data-tour="qr-descargar"]',
      title: 'Descargar tu QR',
      body: 'Lo recomendado: PNG alta resolución para imprimir en lona o póster.',
      placement: 'left',
      icon: 'download',
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
      body: 'Invita a personas para que te ayuden a recibir pedidos y administrar inventario.',
      placement: 'center',
      icon: 'users',
      illustration: 'staff',
    },
    {
      target: '[data-tour="staff-nuevo"]',
      title: 'Agregar miembro',
      body: 'Cada miembro tiene su correo y contraseña. Tú decides qué módulos puede ver.',
      placement: 'left',
      icon: 'plus',
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
      body: 'Acá ves tu plan actual, cuánto te falta del trial y puedes cambiar tu método de pago.',
      placement: 'center',
      icon: 'card',
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
