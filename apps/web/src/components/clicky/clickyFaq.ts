import type { IconName } from '@/components/ui/Icon';

/**
 * Preguntas rápidas de Clicky. Cada una dispara un tour ya existente en
 * `components/help/tours.ts` (spotlight real sobre el botón, sin costo de
 * IA ni riesgo de que alucine dónde pulsar). Ver docs/features/clicky-assistant.md.
 */
export interface ClickyQuickAction {
  question: string;
  reply: string;
  tourSlug: string;
  /** Ruta del módulo — Clicky navega aquí antes de arrancar el tour, sin
   *  importar en qué pantalla esté el usuario cuando pregunta. */
  route: string;
  icon: IconName;
}

export const CLICKY_QUICK_ACTIONS: ClickyQuickAction[] = [
  {
    question: '¿Cómo agrego un producto?',
    reply: 'Fácil, te lo muestro paso a paso 👇',
    tourSlug: 'productos',
    route: '/admin/productos',
    icon: 'package',
  },
  {
    question: '¿Cómo creo una categoría?',
    reply: 'Vamos a Categorías, te marco dónde.',
    tourSlug: 'categorias',
    route: '/admin/categorias',
    icon: 'utensils',
  },
  {
    question: '¿Cómo gestiono mis pedidos?',
    reply: 'Te muestro dónde ver y actualizar el estado de un pedido.',
    tourSlug: 'pedidos',
    route: '/admin/pedidos',
    icon: 'truck',
  },
  {
    question: '¿Cómo controlo mi inventario?',
    reply: 'Vamos a Inventario, ahí ajustas tu stock e ingredientes.',
    tourSlug: 'inventario',
    route: '/admin/inventario',
    icon: 'chart',
  },
  {
    question: '¿Cómo descargo mi código QR?',
    reply: 'Te llevo a la sección de QR de tu local.',
    tourSlug: 'qr',
    route: '/admin/qr',
    icon: 'compass',
  },
  {
    question: '¿Cómo cambio mis horarios?',
    reply: 'Te marco dónde configurar tus horarios de atención.',
    tourSlug: 'horarios',
    route: '/admin/horarios',
    icon: 'clock',
  },
  {
    question: '¿Cómo invito a mi equipo?',
    reply: 'Vamos a Staff, ahí creas cuentas para mesero, cocina o caja.',
    tourSlug: 'staff',
    route: '/admin/staff',
    icon: 'users',
  },
  {
    question: '¿Dónde veo mis métricas de ventas?',
    reply: 'Te muestro tu panel de métricas y qué significa cada número.',
    tourSlug: 'metricas',
    route: '/admin/metricas',
    icon: 'sparkles',
  },
  {
    question: '¿Cómo cambio mi plan?',
    reply: 'Vamos a Facturación, ahí puedes subir o cambiar tu plan.',
    tourSlug: 'billing',
    route: '/admin/billing',
    icon: 'card',
  },
];
