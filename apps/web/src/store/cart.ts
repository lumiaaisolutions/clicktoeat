'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartExtra {
  group: string;
  item: string;
  price: number;
}

export interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;          // precio unitario con extras aplicados
  cantidad: number;
  imagen: string | null;
  extras: CartExtra[];
  notas?: string;
  /** llave única por (productoId + extras hash) para diferenciar variantes */
  lineKey: string;
}

interface CartState {
  /** slug del local activo — el carrito se purga al cambiar de tenant */
  localSlug: string | null;
  items: CartItem[];
  /** F100 — código de cupón aplicado al carrito (se persiste con el cart) */
  coupon: string | null;

  setLocal: (slug: string) => void;
  add: (item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => void;
  remove: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;

  subtotal: () => number;
  itemCount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      localSlug: null,
      items: [],
      coupon: null,

      setLocal(slug) {
        if (get().localSlug !== slug) {
          set({ localSlug: slug, items: [], coupon: null });
        }
      },

      setCoupon(code) {
        set({ coupon: code ? code.toUpperCase().trim() : null });
      },

      add(input) {
        const cantidad = input.cantidad ?? 1;
        set((s) => {
          const existing = s.items.find((i) => i.lineKey === input.lineKey);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.lineKey === input.lineKey ? { ...i, cantidad: i.cantidad + cantidad } : i,
              ),
            };
          }
          return { items: [...s.items, { ...input, cantidad }] };
        });
      },

      remove(lineKey) {
        set((s) => ({ items: s.items.filter((i) => i.lineKey !== lineKey) }));
      },

      setQty(lineKey, qty) {
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.lineKey !== lineKey)
            : s.items.map((i) => (i.lineKey === lineKey ? { ...i, cantidad: qty } : i)),
        }));
      },

      clear() {
        set({ items: [], coupon: null });
      },

      subtotal() {
        return get().items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
      },

      itemCount() {
        return get().items.reduce((sum, i) => sum + i.cantidad, 0);
      },
    }),
    {
      name: 'clickeat:cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ localSlug: s.localSlug, items: s.items, coupon: s.coupon }),
    },
  ),
);
