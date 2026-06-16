'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface LogRow {
  id: number;
  actor: { id: number; nombre: string; rol: string; email: string } | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  local_id: number | null;
  created_at: string;
}

interface Paginated {
  data: LogRow[];
  meta?: { last_page: number; current_page: number; total: number };
}

export default function AuditoriaPage() {
  const [data, setData] = useState<Paginated | null>(null);
  const [q,    setQ]    = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setData(null);
    api.get<Paginated>('/admin/audit-logs', { params: { q: q || undefined, page } })
      .then(({ data }) => setData(data));
  }, [q, page]);

  return (
    <div>
      <AdminPageHeader
        kicker="Historial"
        kickerIcon="history"
        title="Quién hizo qué,"
        titleAccent="cuándo y dónde."
        description="Historial completo de la actividad en la plataforma. Útil para resolver dudas, dar soporte y revisar seguridad."
      />

      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
        placeholder="Buscar por nombre, acción o local…"
        className="w-full px-3 py-2 border border-line rounded-xl bg-white mb-4"
      />

      {!data ? <Skeleton className="h-96" /> : data.data.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">Sin registros.</p>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-line/30 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Cuándo</th>
                <th className="px-3 py-2 text-left">Quién</th>
                <th className="px-3 py-2 text-left">Acción</th>
                <th className="px-3 py-2 text-left">Sobre</th>
                <th className="px-3 py-2 text-left">Local</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.data.map((r) => (
                <tr key={r.id} className="hover:bg-line/20">
                  <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{new Date(r.created_at).toLocaleString('es-MX')}</td>
                  <td className="px-3 py-2">
                    {r.actor ? (
                      <div>
                        <p className="font-medium">{r.actor.nombre}</p>
                        <p className="text-[10px] text-muted">{r.actor.rol}</p>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{humanizeAction(r.action)}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.subject_type ? `${humanizeSubject(r.subject_type)} #${r.subject_id}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.local_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    'created':  'Creó',
    'updated':  'Editó',
    'deleted':  'Borró',
    'restored': 'Restauró',
  };
  // Si viene como "producto.updated" o solo "updated", buscamos la última parte
  const parts = action.split('.');
  const verb  = parts[parts.length - 1];
  return map[verb] ?? action;
}

function humanizeSubject(type: string): string {
  const last = (type.split('\\').pop() ?? type).toLowerCase();
  const map: Record<string, string> = {
    'producto':  'Producto',
    'categoria': 'Categoría',
    'pedido':    'Pedido',
    'local':     'Local',
    'user':      'Usuario',
    'cupon':     'Cupón',
    'compra':    'Compra',
    'ingrediente': 'Ingrediente',
  };
  return map[last] ?? last.charAt(0).toUpperCase() + last.slice(1);
}
