'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

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
  const [filtroAccion, setFiltroAccion] = useState<'todas' | 'created' | 'updated' | 'deleted' | 'restored'>('todas');

  useEffect(() => {
    setData(null);
    api.get<Paginated>('/admin/audit-logs', { params: { q: q || undefined, page } })
      .then(({ data }) => setData(data));
  }, [q, page]);

  const rows = (data?.data ?? []).filter((r) => {
    if (filtroAccion === 'todas') return true;
    const verb = r.action.split('.').pop() ?? r.action;
    return verb === filtroAccion;
  });

  // Agrupa por día para timeline visual
  const grupos = groupByDay(rows);

  return (
    <div>
      <AdminPageHeader
        kicker="Historial"
        kickerIcon="history"
        title="Quién hizo qué,"
        titleAccent="cuándo y dónde."
        description="Línea de tiempo de la actividad en la plataforma. Útil para resolver dudas, dar soporte y revisar seguridad."
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, acción o local…"
          className="flex-1 px-3 py-2 border border-line rounded-xl bg-white"
        />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { v: 'todas',     l: 'Todas',     i: 'list',     c: 'bg-ink text-white' },
            { v: 'created',   l: 'Creado',    i: 'plus',     c: 'bg-emerald-100 text-emerald-700' },
            { v: 'updated',   l: 'Editado',   i: 'palette',  c: 'bg-amber-100 text-amber-700' },
            { v: 'deleted',   l: 'Borrado',   i: 'x',        c: 'bg-red-100 text-red-700' },
            { v: 'restored',  l: 'Restaurado',i: 'history',  c: 'bg-blue-100 text-blue-700' },
          ] as const).map(({ v, l, i, c }) => (
            <button
              key={v}
              onClick={() => setFiltroAccion(v)}
              className={cn(
                'shrink-0 px-3 py-2 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap',
                filtroAccion === v ? c + ' border-transparent shadow-sm' : 'bg-white border-line hover:border-ink/30',
              )}
            >
              <Icon name={i as IconName} size={11} />
              {l}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <Icon name="history" size={28} className="mx-auto text-muted mb-2" />
          <p className="text-sm text-muted">Sin registros para este filtro.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ dia, etiqueta, items }) => (
            <section key={dia}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-muted">{etiqueta}</span>
                <div className="flex-1 h-px bg-line" />
                <span className="text-[10px] text-muted">{items.length} {items.length === 1 ? 'acción' : 'acciones'}</span>
              </div>

              <div className="rounded-2xl border border-line bg-white overflow-hidden">
                <ul className="divide-y divide-line">
                  {items.map((r) => {
                    const meta = ACTION_META[(r.action.split('.').pop() ?? r.action) as keyof typeof ACTION_META] ?? ACTION_META.other;
                    const iniciales = (r.actor?.nombre || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';
                    return (
                      <li key={r.id} className="p-4 flex items-start gap-3 hover:bg-line/10 transition">
                        {/* Avatar del actor */}
                        <div className={cn(
                          'shrink-0 w-10 h-10 rounded-full grid place-items-center text-xs font-bold',
                          r.actor?.rol === 'super_admin' ? 'bg-violet-50 text-violet-700'
                          : r.actor?.rol === 'owner' ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-700',
                        )}>
                          {iniciales}
                        </div>

                        {/* Texto principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{r.actor?.nombre ?? 'Sistema'}</span>
                            {r.actor?.rol && (
                              <span className={cn(
                                'text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded',
                                r.actor.rol === 'super_admin' ? 'bg-violet-50 text-violet-700'
                                : r.actor.rol === 'owner' ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-zinc-100 text-zinc-600',
                              )}>{r.actor.rol === 'super_admin' ? 'admin' : r.actor.rol}</span>
                            )}
                            <span className={cn('inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full', meta.badgeCls)}>
                              <Icon name={meta.icon} size={9} />
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted mt-0.5">
                            <span className={meta.textCls}>{meta.verb}</span>{' '}
                            <span className="text-ink font-medium">{r.subject_type ? humanizeSubject(r.subject_type) : 'algo'}</span>
                            {r.subject_id && <span className="text-muted font-mono text-xs"> #{r.subject_id}</span>}
                            {r.local_id && <span className="text-muted"> · local <span className="font-mono">#{r.local_id}</span></span>}
                          </p>
                          {r.actor?.email && (
                            <p className="text-[11px] text-muted mt-0.5 truncate">{r.actor.email}</p>
                          )}
                        </div>

                        {/* Hora */}
                        <div className="shrink-0 text-right">
                          <span className="text-xs text-muted whitespace-nowrap tabular-nums">
                            {new Date(r.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTION_META: Record<string, { label: string; verb: string; icon: IconName; badgeCls: string; textCls: string }> = {
  created: {
    label: 'Creó',
    verb:  'creó',
    icon:  'plus',
    badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    textCls:  'text-emerald-700 font-semibold',
  },
  updated: {
    label: 'Editó',
    verb:  'editó',
    icon:  'palette',
    badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200',
    textCls:  'text-amber-700 font-semibold',
  },
  deleted: {
    label: 'Borró',
    verb:  'borró',
    icon:  'x',
    badgeCls: 'bg-red-50 text-red-700 border border-red-200',
    textCls:  'text-red-700 font-semibold',
  },
  restored: {
    label: 'Restauró',
    verb:  'restauró',
    icon:  'history',
    badgeCls: 'bg-blue-50 text-blue-700 border border-blue-200',
    textCls:  'text-blue-700 font-semibold',
  },
  other: {
    label: 'Acción',
    verb:  'tocó',
    icon:  'settings',
    badgeCls: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    textCls:  'text-zinc-700 font-semibold',
  },
};

function humanizeSubject(type: string): string {
  const last = (type.split('\\').pop() ?? type).toLowerCase();
  const map: Record<string, string> = {
    'producto':    'Producto',
    'categoria':   'Categoría',
    'pedido':      'Pedido',
    'local':       'Local',
    'user':        'Usuario',
    'cupon':       'Cupón',
    'compra':      'Compra',
    'ingrediente': 'Ingrediente',
    'review':      'Calificación',
    'staff':       'Staff',
    'horario':     'Horario',
  };
  return map[last] ?? last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * Agrupa logs por día (basado en la fecha local). Devuelve secciones con
 * etiqueta humana ("Hoy", "Ayer", "lun 16 de junio") para timeline visual.
 */
function groupByDay(rows: LogRow[]): Array<{ dia: string; etiqueta: string; items: LogRow[] }> {
  const grupos = new Map<string, LogRow[]>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = d.toISOString().slice(0, 10);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(r);
  }
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const ayer  = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  return Array.from(grupos.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dia, items]) => {
      const d = new Date(dia + 'T00:00:00');
      const isHoy = d.getTime() === hoy.getTime();
      const isAyer = d.getTime() === ayer.getTime();
      const etiqueta = isHoy ? 'Hoy' : isAyer ? 'Ayer'
        : d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' });
      return { dia, etiqueta, items };
    });
}
