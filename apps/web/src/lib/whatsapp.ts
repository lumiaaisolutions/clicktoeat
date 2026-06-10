import type { CartItem } from '@/store/cart';
import type { MenuResponse } from '@/lib/api';
import { formatMXN } from '@/lib/utils';

export interface WhatsAppPayload {
  cliente: { nombre: string; telefono: string; direccion?: string; notas?: string };
  metodoEntrega: 'pickup' | 'delivery';
  metodoPago: 'efectivo' | 'tarjeta_entrega' | 'transferencia';
  folio?: string;
}

/**
 * Espejo en TypeScript de App\Services\WhatsApp\WhatsAppLinkBuilder.
 * Cualquier cambio aquí debe reflejarse del lado PHP y vice-versa.
 */
export function buildWhatsAppUrl(
  local: MenuResponse['data']['local'],
  items: CartItem[],
  payload: WhatsAppPayload,
): string {
  const lines: string[] = [];

  lines.push(`Hola ${local.nombre}, quiero pedir:`);
  lines.push('');

  let subtotal = 0;
  for (const item of items) {
    const lineTotal = item.precio * item.cantidad;
    subtotal += lineTotal;
    lines.push(`• ${item.cantidad}× ${item.nombre} — ${formatMXN(lineTotal)}`);
    for (const extra of item.extras ?? []) {
      lines.push(`    ↳ ${extra.group}: ${extra.item}`);
    }
    if (item.notas) lines.push(`    ↳ Nota: ${item.notas}`);
  }

  const fee = payload.metodoEntrega === 'delivery' ? local.delivery.fee : 0;
  const total = subtotal + fee;

  lines.push('');
  lines.push(`Subtotal: ${formatMXN(subtotal)}`);
  if (fee > 0) lines.push(`Envío:    ${formatMXN(fee)}`);
  lines.push(`Total:    ${formatMXN(total)}`);
  lines.push('');
  lines.push(`Nombre:    ${payload.cliente.nombre}`);
  lines.push(`Teléfono:  ${payload.cliente.telefono}`);
  if (payload.metodoEntrega === 'delivery' && payload.cliente.direccion) {
    lines.push(`Dirección: ${payload.cliente.direccion}`);
  } else {
    lines.push('Entrega:   Recoger en sucursal');
  }
  lines.push(`Pago:      ${labelPago(payload.metodoPago)}`);
  if (payload.folio) lines.push(`Folio:     ${payload.folio}`);

  const phone = local.whatsapp.replace(/\D+/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function labelPago(m: WhatsAppPayload['metodoPago']): string {
  switch (m) {
    case 'efectivo':        return 'Efectivo';
    case 'tarjeta_entrega': return 'Tarjeta a la entrega';
    case 'transferencia':   return 'Transferencia';
  }
}
