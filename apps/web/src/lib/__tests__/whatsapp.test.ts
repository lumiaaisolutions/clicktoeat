import { describe, expect, it } from 'vitest';
import type { CartItem } from '@/store/cart';
import type { MenuResponse } from '@/lib/api';
import { buildWhatsAppUrl, type WhatsAppPayload } from '@/lib/whatsapp';

/**
 * El formato del mensaje es un ESPEJO de
 * App\Services\WhatsApp\WhatsAppLinkBuilder (backend). Si un cambio rompe
 * estos asserts, revisa que el lado PHP se actualice igual (y viceversa) —
 * regla de CLAUDE.md. El test del backend vive en PedidoFlowTest.
 */

const local = {
  nombre: 'Tacos Test',
  whatsapp: '+52 1 55 1234-5678',
  delivery: { fee: 35 },
} as MenuResponse['data']['local'];

const items: CartItem[] = [
  {
    productoId: 1,
    nombre: 'Taco al Pastor',
    precio: 30,
    cantidad: 2,
    imagen: null,
    extras: [{ group: 'Salsa', item: 'Verde', price: 0 }],
    lineKey: '1-a',
  },
  {
    productoId: 2,
    nombre: 'Agua de Horchata',
    precio: 25,
    cantidad: 1,
    imagen: null,
    extras: [],
    notas: 'Sin hielo',
    lineKey: '2-b',
  },
];

const basePayload: WhatsAppPayload = {
  cliente: { nombre: 'María', telefono: '5215599999999' },
  metodoEntrega: 'pickup',
  metodoPago: 'efectivo',
  folio: 'PED-0042',
};

function decodedText(url: string): string {
  return decodeURIComponent(url.split('?text=')[1]);
}

describe('buildWhatsAppUrl (espejo de WhatsAppLinkBuilder PHP)', () => {
  it('arma la URL wa.me con solo dígitos del teléfono del local', () => {
    const url = buildWhatsAppUrl(local, items, basePayload);
    expect(url.startsWith('https://wa.me/5215512345678?text=')).toBe(true);
  });

  it('respeta el formato de líneas del backend (saludo, items, extras, totales, datos)', () => {
    const text = decodedText(buildWhatsAppUrl(local, items, basePayload));
    const lines = text.split('\n');

    expect(lines[0]).toBe('Hola Tacos Test, quiero pedir:');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('• 2× Taco al Pastor — $60');
    expect(lines[3]).toBe('    ↳ Salsa: Verde');
    expect(lines[4]).toBe('• 1× Agua de Horchata — $25');
    expect(lines[5]).toBe('    ↳ Nota: Sin hielo');
    expect(text).toContain('Subtotal: $85');
    expect(text).toContain('Total:    $85');
    expect(text).toContain('Nombre:    María');
    expect(text).toContain('Teléfono:  5215599999999');
    expect(text).toContain('Pago:      Efectivo');
    expect(text).toContain('Folio:     PED-0042');
  });

  it('pickup: no cobra envío y marca "Recoger en sucursal"', () => {
    const text = decodedText(buildWhatsAppUrl(local, items, basePayload));
    expect(text).not.toContain('Envío:');
    expect(text).toContain('Entrega:   Recoger en sucursal');
  });

  it('delivery: suma delivery fee y muestra la dirección', () => {
    const text = decodedText(
      buildWhatsAppUrl(local, items, {
        ...basePayload,
        metodoEntrega: 'delivery',
        cliente: { ...basePayload.cliente, direccion: 'Av. Siempre Viva 742' },
      }),
    );
    expect(text).toContain('Envío:    $35');
    expect(text).toContain('Total:    $120');
    expect(text).toContain('Dirección: Av. Siempre Viva 742');
    expect(text).not.toContain('Recoger en sucursal');
  });

  it('etiquetas de pago iguales a labelPago() del backend', () => {
    for (const [metodo, label] of [
      ['efectivo', 'Efectivo'],
      ['tarjeta_entrega', 'Tarjeta a la entrega'],
      ['transferencia', 'Transferencia'],
    ] as const) {
      const text = decodedText(
        buildWhatsAppUrl(local, items, { ...basePayload, metodoPago: metodo }),
      );
      expect(text).toContain(`Pago:      ${label}`);
    }
  });

  it('sin folio no imprime la línea Folio', () => {
    const text = decodedText(
      buildWhatsAppUrl(local, items, { ...basePayload, folio: undefined }),
    );
    expect(text).not.toContain('Folio:');
  });
});
