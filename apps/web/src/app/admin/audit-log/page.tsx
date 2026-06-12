'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AuditLog, Paginated } from '@/lib/types';
import { toast } from '@/store/toast';
import { Skeleton } from '@/components/ui/Skeleton';

const RESOURCE_TYPES = ['Producto', 'Categoria', 'Pedido', 'Ingrediente', 'Compra', 'Local', 'User'];
const ACTIONS = ['created', 'updated', 'deleted', 'restored'] as const;

const ACTION_LABEL: Record<string, string> = {
  created:  'Creó',
  updated:  'Editó',
  deleted:  'Eliminó',
  restored: 'Restauró',
};

const ACTION_COLOR: Record<string, string> = {
  created:  'bg-green-100 text-green-800',
  updated:  'bg-blue-100 text-blue-800',
  deleted:  'bg-red-100 text-red-800',
  restored: 'bg-purple-100 text-purple-800',
};

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLog[] | null>(null);
  const [meta, setMeta] = useState<Paginated<AuditLog>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    desde: '',
    hasta: '',
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const refresh = async () => {
    setItems(null);
    const params: Record<string, string> = { page: String(page), per_page: '50' };
    if (filters.resource_type) params.resource_type = filters.resource_type;
    if (filters.action)        params.action = filters.action;
    if (filters.desde)         params.desde = filters.desde;
    if (filters.hasta)         params.hasta = filters.hasta;

    try {
      const { data } = await api.get<Paginated<AuditLog>>('/audit-logs', { params });
      setItems(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No pudimos cargar el audit log');
      setItems([]);
    }
  };

  useEffect(() => { refresh(); }, [page, filters]);

  const resetFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="ce-display text-2xl md:text-4xl font-bold">Audit log</h1>
          <p className="text-muted text-sm mt-1">
            Historial de cambios en tu local (últimos 90 días).
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="rounded-2xl border border-line bg-white p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={filters.resource_type}
          onChange={(e) => resetFilter('resource_type', e.target.value)}
          className="px-3 py-2 border border-line rounded-xl text-sm"
        >
          <option value="">Todos los recursos</option>
          {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filters.action}
          onChange={(e) => resetFilter('action', e.target.value)}
          className="px-3 py-2 border border-line rounded-xl text-sm"
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
        </select>

        <input
          type="date"
          value={filters.desde}
          onChange={(e) => resetFilter('desde', e.target.value)}
          className="px-3 py-2 border border-line rounded-xl text-sm"
          placeholder="Desde"
        />

        <input
          type="date"
          value={filters.hasta}
          onChange={(e) => resetFilter('hasta', e.target.value)}
          className="px-3 py-2 border border-line rounded-xl text-sm"
          placeholder="Hasta"
        />
      </div>

      {/* Lista */}
      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          No hay actividad para los filtros seleccionados.
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 border-b border-line">
              <tr>
                <th className="text-left p-3 font-medium">Cuándo</th>
                <th className="text-left p-3 font-medium">Quién</th>
                <th className="text-left p-3 font-medium">Qué hizo</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    className="border-b border-line last:border-0 hover:bg-bg/30 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="p-3 text-xs text-muted">
                      {new Date(log.created_at).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="p-3">
                      {log.actor ? (
                        <>
                          <div className="font-medium">{log.actor.nombre}</div>
                          <div className="text-xs text-muted">{log.actor.rol}</div>
                        </>
                      ) : (
                        <span className="text-muted italic">Sistema</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${ACTION_COLOR[log.action]}`}>
                        {ACTION_LABEL[log.action]}
                      </span>
                      <span className="ml-2 text-muted text-xs">
                        {log.resource_type} #{log.resource_id}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell text-xs text-muted">
                      {log.ip ?? '—'}
                    </td>
                  </tr>
                  {expandedId === log.id && log.changes && (
                    <tr className="border-b border-line bg-bg/20">
                      <td colSpan={4} className="p-4">
                        <h4 className="text-xs uppercase tracking-wide text-muted mb-2">Cambios</h4>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted">
                              <th className="text-left pb-1 pr-3">Campo</th>
                              <th className="text-left pb-1 pr-3">Antes</th>
                              <th className="text-left pb-1">Después</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(log.changes).map(([field, [before, after]]) => (
                              <tr key={field} className="border-t border-line/50">
                                <td className="py-1 pr-3 font-mono">{field}</td>
                                <td className="py-1 pr-3 text-red-700 line-through">{formatVal(before)}</td>
                                <td className="py-1 text-green-700">{formatVal(after)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Página {meta.current_page} de {meta.last_page} · {meta.total} entradas
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border border-line rounded-xl disabled:opacity-30"
            >
              ← Anterior
            </button>
            <button
              disabled={page === meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-line rounded-xl disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
