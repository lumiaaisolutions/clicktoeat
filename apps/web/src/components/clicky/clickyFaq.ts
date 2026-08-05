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
  icon: IconName;
}

export const CLICKY_QUICK_ACTIONS: ClickyQuickAction[] = [
  {
    question: '¿Cómo agrego un producto?',
    reply: 'Fácil, te lo muestro paso a paso 👇',
    tourSlug: 'productos',
    icon: 'package',
  },
  {
    question: '¿Cómo creo una categoría?',
    reply: 'Vamos a tu menú lateral, te marco dónde.',
    tourSlug: 'categorias',
    icon: 'utensils',
  },
  {
    question: '¿Cómo gestiono mis pedidos?',
    reply: 'Te muestro dónde ver y actualizar el estado de un pedido.',
    tourSlug: 'pedidos',
    icon: 'truck',
  },
  {
    question: '¿Cómo controlo mi inventario?',
    reply: 'Vamos a Inventario, ahí ajustas tu stock e ingredientes.',
    tourSlug: 'inventario',
    icon: 'chart',
  },
  {
    question: '¿Cómo descargo mi código QR?',
    reply: 'Te llevo a la sección de QR de tu local.',
    tourSlug: 'qr',
    icon: 'compass',
  },
  {
    question: '¿Cómo cambio mis horarios?',
    reply: 'Te marco dónde configurar tus horarios de atención.',
    tourSlug: 'horarios',
    icon: 'clock',
  },
  {
    question: '¿Cómo invito a mi equipo?',
    reply: 'Vamos a Staff, ahí creas cuentas para mesero, cocina o caja.',
    tourSlug: 'staff',
    icon: 'users',
  },
  {
    question: '¿Dónde veo mis métricas de ventas?',
    reply: 'Te muestro tu panel de métricas y qué significa cada número.',
    tourSlug: 'metricas',
    icon: 'sparkles',
  },
  {
    question: '¿Cómo cambio mi plan?',
    reply: 'Vamos a Facturación, ahí puedes subir o cambiar tu plan.',
    tourSlug: 'billing',
    icon: 'card',
  },
];
