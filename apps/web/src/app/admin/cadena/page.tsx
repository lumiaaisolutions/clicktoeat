'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface LocalResumen {
  localId: number;
  nombre: string;
  slug: string;
  ventas30d: number;
  productosActivos: number;
}

interface Resumen {
  organizationId: number;
  nombre: string;
  totalLocales: number;
  ventasTotales30d: number;
  porLocal: LocalResumen[];
}

/** Reporte consolidado de sucursales (v1 solo lectura — ver ADR-014). */
export default function CadenaPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<{ data: Resumen }>('/organizations/mine')
      .then(({ data }) => setResumen(data.data))
      .catch(() => setNotFound(true));
  }, []);

  if (notFound) {
    return (
      <div className="rounded-3xl border border-line bg-white p-10 text-center">
        <Icon name="storefront" size={28} className="text-muted mx-auto" />
        <p className="ce-display text-xl font-bold mt-3">Tu cuenta no pertenece a ninguna cadena todavía</p>
        <p className="text-sm text-muted mt-1">Pídele a soporte que agrupe tus sucursales bajo una organización.</p>
      </div>
    );
  }

  if (resumen === null) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        kicker="Cadena" kickerIcon="storefront"
        title={resumen.nombre} titleAccent="reporte consolidado."
        description={`${resumen.totalLocales} sucursales · $${resumen.ventasTotales30d.toFixed(2)} en ventas (últimos 30 días)`}
      />

      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-line/20">
            <tr>
              <th className="text-left p-3">Sucursal</th>
              <th className="text-right p-3">Ventas 30d</th>
              <th className="text-right p-3">Productos activos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {resumen.porLocal.map((l) => (
              <tr key={l.localId}>
                <td className="p-3 font-medium">{l.nombre}</td>
                <td className="p-3 text-right">${l.ventas30d.toFixed(2)}</td>
                <td className="p-3 text-right">{l.productosActivos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
