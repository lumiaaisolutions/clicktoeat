'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const ZonasMap = dynamic(() => import('@/components/admin/ZonasMap'), { ssr: false });

interface Pin {
  id: number;
  nombre: string;
  slug: string;
  ciudad: string | null;
  estado: string | null;
  lat: number;
  lng: number;
  ventas_mes: number;
  pedidos_mes: number;
}

export default function ZonasPage() {
  const [pins, setPins] = useState<Pin[] | null>(null);
  const [q,    setQ]    = useState('');

  useEffect(() => {
    api.get<{ data: Pin[] }>('/admin/metricas-zonas')
      .then(({ data }) => setPins(data.data))
      .catch(() => setPins([]));
  }, []);

  // Agregado por ciudad
  const ranking = useMemo(() => {
    if (!pins) return [];
    const map = new Map<string, { ciudad: string; ventas: number; pedidos: number; locales: number }>();
    for (const p of pins) {
      const key = `${p.ciudad ?? 'Sin ciudad'}${p.estado ? ', ' + p.estado : ''}`;
      const row = map.get(key) ?? { ciudad: key, ventas: 0, pedidos: 0, locales: 0 };
      row.ventas  += p.ventas_mes;
      row.pedidos += p.pedidos_mes;
      row.locales += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.ventas - a.ventas);
  }, [pins]);

  const filtered = useMemo(() => {
    if (!pins) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return pins;
    return pins.filter((p) =>
      p.nombre.toLowerCase().includes(needle)
      || (p.ciudad ?? '').toLowerCase().includes(needle)
      || (p.estado ?? '').toLowerCase().includes(needle),
    );
  }, [pins, q]);

  return (
    <div>
      <AdminPageHeader
        kicker="Zonas"
        kickerIcon="map-pin"
        title="Tus locales,"
        titleAccent="en un mapa."
        description="Mira en qué ciudades vendes más este mes. Cada círculo es un local — mientras más grande, más ventas."
      />

      {!pins ? <Skeleton className="h-96" /> : pins.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center text-muted">
          Ningún local tiene coordenadas (lat/lng) capturadas. Agrégalas desde su panel para verlos acá.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-6">
            <div className="relative h-[480px] w-full rounded-3xl border border-line bg-white overflow-hidden isolate">
              <ZonasMap pins={filtered} />
            </div>

            <aside className="rounded-3xl border border-line bg-white p-4 overflow-y-auto max-h-[480px]">
              <h3 className="ce-display font-bold mb-3">Ciudades con más ventas</h3>
              {ranking.length === 0 ? (
                <p className="text-sm text-muted">Sin datos todavía.</p>
              ) : (
                <ul className="space-y-2">
                  {ranking.slice(0, 12).map((r) => (
                    <li key={r.ciudad} className="border-b border-line pb-2 last:border-0">
                      <p className="font-semibold text-sm">{r.ciudad}</p>
                      <p className="text-xs text-muted">{r.locales} {r.locales === 1 ? 'local' : 'locales'} · {r.pedidos} pedidos</p>
                      <p className="text-sm font-bold text-emerald-700">${r.ventas.toLocaleString('es-MX')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>

          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por nombre, ciudad o estado…"
            className="w-full px-3 py-2 border border-line rounded-xl bg-white mb-3"
          />

          <div className="rounded-2xl border border-line bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-line/30 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Local</th>
                  <th className="px-3 py-2 text-left">Ciudad</th>
                  <th className="px-3 py-2 text-right">Pedidos</th>
                  <th className="px-3 py-2 text-right">Ventas (mes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-line/20">
                    <td className="px-3 py-2 font-medium">{p.nombre}</td>
                    <td className="px-3 py-2 text-xs">{p.ciudad ?? '—'}{p.estado ? `, ${p.estado}` : ''}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.pedidos_mes}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">${p.ventas_mes.toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
