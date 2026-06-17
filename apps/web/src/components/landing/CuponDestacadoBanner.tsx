'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';
import { Icon } from '@/components/ui/Icon';
import type { MenuProducto } from '@/lib/api';

interface CuponDestacado {
  id: number;
  codigo: string;
  tipo: 'percent' | 'fixed';
  valor: number;
  min_subtotal: number;
  productos_sugeridos: number[];
  hora_inicio: string | null;
  hora_fin: string | null;
  descripcion_corta: string;
}

interface Props {
  slug: string;
  productos: MenuProducto[];
}

const DISMISS_PREFIX = 'ce-cupon-banner-dismissed-';

/**
 * Banner flotante arriba de la landing del local que muestra cupones
 * destacados activos AHORA. Al tocar "Aprovechar":
 *   1. Agrega productos_sugeridos al carrito
 *   2. Aplica el código de cupón al carrito (el cliente lo ve aplicado en el sheet)
 */
export function CuponDestacadoBanner({ slug, productos }: Props) {
  const [cupones, setCupones] = useState<CuponDestacado[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const add       = useCart((s) => s.add);
  const setCoupon = useCart((s) => s.setCoupon);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${DISMISS_PREFIX}${slug}`);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {}

    api.get<{ data: CuponDestacado[] }>(`/public/cupones/${slug}/destacados`)
      .then(({ data }) => setCupones(data.data))
      .catch(() => setCupones([]));

    // Refresca cada 5 minutos por si el cupón cambia de horario
    const id = setInterval(() => {
      api.get<{ data: CuponDestacado[] }>(`/public/cupones/${slug}/destacados`)
        .then(({ data }) => setCupones(data.data))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [slug]);

  const visibles = cupones.filter((c) => !dismissed.has(c.id));
  if (visibles.length === 0) return null;

  const cupon = visibles[0]; // mostramos solo el primero (uno por uno)

  const dismiss = () => {
    const next = new Set(dismissed); next.add(cupon.id);
    setDismissed(next);
    try { localStorage.setItem(`${DISMISS_PREFIX}${slug}`, JSON.stringify([...next])); } catch {}
  };

  const aprovechar = () => {
    for (const productoId of cupon.productos_sugeridos) {
      const prod = productos.find((p) => p.id === productoId);
      if (!prod) continue;
      add({
        productoId: prod.id,
        nombre:     prod.nombre,
        precio:     Number(prod.precio),
        imagen:     prod.imagen ?? null,
        extras:     [],
        notas:      '',
        lineKey:    `cupon-${cupon.codigo}-${prod.id}`,
      });
    }
    setCoupon(cupon.codigo);
    dismiss();
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 px-3 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white shadow-soft"
    >
      <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap">
        <Icon name="sparkles" size={16} className="shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">
            🔥 ¡Promo activa ahora! <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded ml-1 text-xs">{cupon.codigo}</span>
          </p>
          <p className="text-[11px] opacity-90 leading-tight mt-0.5">
            {cupon.descripcion_corta}
            {cupon.hora_inicio && cupon.hora_fin && (
              <> · Hasta las {cupon.hora_fin.slice(0, 5)}</>
            )}
            {cupon.min_subtotal > 0 && (
              <> · Pedido mínimo ${cupon.min_subtotal}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={aprovechar}
          className="px-3 py-1.5 rounded-full bg-white text-orange-700 text-xs font-bold hover:bg-amber-50 transition shrink-0"
        >
          {cupon.productos_sugeridos.length > 0 ? 'Aprovechar' : 'Aplicar código'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 text-white/70 hover:text-white p-1"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
