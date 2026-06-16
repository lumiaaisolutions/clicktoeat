'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AuditLog, Paginated } from '@/lib/types';
import { toast } from '@/store/toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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
      <AdminPageHeader
        kicker="Historial"
        kickerIcon="history"
        title="Quién hizo qué,"
        titleAccent="y cuándo."
        description="Historial completo de cambios en tu local. Útil cuando alguien modifica un precio o borra algo."
        tourSlug="audit-log"
      />

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

      {/* Timeline de cards */}
      {items === null ? (
        <div className="space-y-2">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-12 text-center">
          <Icon name="history" size={32} className="text-muted mx-auto mb-2" />
          <p className="ce-display text-lg font-bold">Sin actividad</p>
          <p className="text-sm text-muted mt-1">No hay cambios registrados con estos filtros.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((log) => {
            const isOpen = expandedId === log.id;
            const actionIcon: 'plus' | 'check' | 'x' | 'history' =
              log.action === 'created' ? 'plus'
              : log.action === 'updated' ? 'check'
              : log.action === 'deleted' ? 'x'
              : 'history';
            const actionTone =
              log.action === 'created' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : log.action === 'updated' ? 'bg-blue-50 text-blue-700 border-blue-200'
              : log.action === 'deleted' ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-50 text-slate-700 border-slate-200';
            const cambiosCount = log.changes ? Object.keys(log.changes).length : 0;
            return (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : log.id)}
                  className="w-full text-left rounded-3xl border border-line bg-white p-4 sm:p-5 hover:border-ink/30 hover:shadow-soft transition group"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 border ${actionTone}`}>
                      <Icon name={actionIcon} size={18} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${ACTION_COLOR[log.action]}`}>
                          {ACTION_LABEL[log.action]}
                        </span>
                        <code className="text-xs font-semibold text-ink/80">
                          {log.resource_type} #{log.resource_id}
                        </code>
                        {cambiosCount > 0 && (
                          <span className="text-[10px] text-muted">· {cambiosCount} campo{cambiosCount === 1 ? '' : 's'} modificado{cambiosCount === 1 ? '' : 's'}</span>
                        )}
                      </div>
                      <p className="text-sm mt-1">
                        {log.actor ? (
                          <>Por <strong className="font-semibold">{log.actor.nombre}</strong> <span className="text-muted">({log.actor.rol})</span></>
                        ) : (
                          <span className="text-muted italic">Acción automática del sistema</span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5 inline-flex items-center gap-2 flex-wrap">
                        <Icon name="clock" size={11} />
                        {new Date(log.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                        {log.ip && <><span>·</span><span>IP {log.ip}</span></>}
                      </p>
                    </div>

                    <Icon
                      name="chevron-down"
                      size={16}
                      className={`text-muted shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {isOpen && log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-line">
                      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Cambios</p>
                      <ul className="space-y-2">
                        {Object.entries(log.changes).map(([field, [before, after]]) => (
                          <li key={field} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto_1fr] gap-2 items-center text-xs">
                            <code className="font-mono text-ink/80">{field}</code>
                            <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700 line-through truncate">{formatVal(before)}</span>
                            <Icon name="arrow-right" size={12} className="text-muted hidden sm:inline" />
                            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 truncate">{formatVal(after)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
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
