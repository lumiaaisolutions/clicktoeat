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
      body: 'Cada vez que un cliente pide por WhatsApp, aparece aquí. Confirma, prepara, entrega.',
      placement: 'center',
      icon: 'bell',
      illustration: 'pedido',
    },
    {
      target: '[data-tour="pedidos-filtros"]',
      title: 'Filtros',
      body: 'Filtra por estado (nuevos, en preparación, entregados) o por fecha.',
      placement: 'bottom',
      icon: 'list',
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
      body: 'El color primario tiñe los botones, badges y acentos. Elige uno que represente tu local.',
      placement: 'bottom',
      icon: 'sparkles',
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
      body: 'Para cobrar a clientes que pagan en el local. Crea el pedido manualmente y registra el cobro.',
      placement: 'center',
      icon: 'cup-soda',
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
